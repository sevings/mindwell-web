package embedder

import (
	"errors"
	"github.com/patrickmn/go-cache"
	"log"
	"net/http"
	"regexp"
	"time"
)

var errorNoMatch = errors.New("could not embed this link")
var errorNotEmbed = errors.New("this link is not embeddable")

type Embeddable interface {
	Embed() string
	Preview() string
	CacheControl() time.Duration
}

type EmbeddableProvider interface {
	Load(href string) (Embeddable, error)
}

type Embedder struct {
	eps    []EmbeddableProvider
	cache  *cache.Cache
	hrefRe *regexp.Regexp
	aRe    *regexp.Regexp
}

func NewEmbedder() *Embedder {
	e := &Embedder{
		cache:  cache.New(24*time.Hour, 24*time.Hour),
		hrefRe: regexp.MustCompile(`(?i)<a[^>]+href="([^"]+)"[^>]*>([^<]*)</a>`),
		aRe:    regexp.MustCompile(`(?i)<a[^>]+>[^<]*</a>`),
	}

	cli := &http.Client{Timeout: 2 * time.Second}

	e.AddProvider(newYouTube(cli))
	e.AddProvider(newSoundCloud(cli))
	e.AddProvider(newCoub(cli))
	e.AddProvider(newVimeo(cli))
	e.AddProvider(newTickCounter(cli))

	return e
}

func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}

func (e *Embedder) AddProvider(ep EmbeddableProvider) {
	e.eps = append(e.eps, ep)
}

func (e *Embedder) ReplaceAll(html string, embed bool) string {
	return e.aRe.ReplaceAllStringFunc(html, func(tag string) string {
		return e.Convert(tag, embed)
	})
}

func (e *Embedder) Convert(tag string, embed bool) string {
	ht := e.hrefRe.FindAllStringSubmatch(tag, -1)
	if len(ht) == 0 {
		return tag
	}

	href := ht[0][1]
	text := ht[0][2]

	compareLen := min(20, min(len(text), len(href)))
	if compareLen == 0 || href[:compareLen] != text[:compareLen] {
		return tag
	}

	var emb Embeddable

	cached, found := e.cache.Get(href)
	if found {
		emb = cached.(Embeddable)
	} else {
		var err error
		for _, ep := range e.eps {
			emb, err = ep.Load(href)
			if err == nil {
				break
			}
			if err == errorNoMatch {
				continue
			}
			if err != errorNotEmbed {
				log.Println(err)
			}
			emb = &NotEmbed{Tag: tag}
			break
		}
	}

	if !found {
		e.cache.Set(href, emb, emb.CacheControl())
	}

	if embed {
		return emb.Embed()
	}

	return emb.Preview()
}
