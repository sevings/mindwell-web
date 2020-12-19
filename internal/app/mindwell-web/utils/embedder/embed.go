package embedder

import (
	"errors"
	"github.com/patrickmn/go-cache"
	"go.uber.org/zap"
	"net/http"
	"regexp"
	"time"
)

var errorNoMatch = errors.New("could not embed this link")

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
	log    *zap.Logger
}

func NewEmbedder(log *zap.Logger, domain string) *Embedder {
	e := &Embedder{
		cache:  cache.New(24*time.Hour, 24*time.Hour),
		hrefRe: regexp.MustCompile(`(?i)<a[^>]+href="([^"]+)"[^>]*>([^<]*)</a>`),
		aRe:    regexp.MustCompile(`(?i)<a[^>]+>[^<]*</a>`),
		log:    log,
	}

	cli := &http.Client{Timeout: 2 * time.Second}

	e.AddProvider(newYouTube(cli))
	e.AddProvider(newSoundCloud(cli))
	e.AddProvider(newCoub(cli))
	e.AddProvider(newVimeo(cli))
	e.AddProvider(newTickCounter(cli))
	e.AddProvider(newMindwell(domain))
	e.AddProvider(newHtmlProvider(cli))

	return e
}

func (e *Embedder) AddProvider(ep EmbeddableProvider) {
	e.eps = append(e.eps, ep)
}

func (e *Embedder) EmbedAll(html string) string {
	return e.aRe.ReplaceAllStringFunc(html, func(tag string) string {
		return e.Convert(tag).Embed()
	})
}

func (e *Embedder) PreviewAll(html string) string {
	return e.aRe.ReplaceAllStringFunc(html, func(tag string) string {
		return e.Convert(tag).Preview()
	})
}

func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}

func (e *Embedder) Convert(tag string) Embeddable {
	ht := e.hrefRe.FindAllStringSubmatch(tag, -1)
	if len(ht) == 0 {
		return &NotEmbed{Tag: tag}
	}

	href := ht[0][1]
	text := ht[0][2]

	compareLen := min(20, min(len(text), len(href)))
	if compareLen == 0 || href[:compareLen] != text[:compareLen] {
		return &NotEmbed{Tag: tag}
	}

	var emb Embeddable

	cached, found := e.cache.Get(href)
	if found {
		emb = cached.(Embeddable)
	} else {
		e.log.Info("embed",
			zap.String("act", "load"),
			zap.String("url", href))

		var err error
		for _, ep := range e.eps {
			emb, err = ep.Load(href)
			if err == nil {
				break
			}
			if err != errorNoMatch {
				e.log.Warn("embed", zap.Error(err))
			}
		}
		if err != nil {
			emb = &NotEmbed{Tag: tag}
		}
	}

	if !found {
		e.cache.Set(href, emb, emb.CacheControl())
	}

	return emb
}
