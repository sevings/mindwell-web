package images

import (
	"errors"
	"go.uber.org/zap"
	"html"
	"net/url"
	"regexp"
)

type Embeddable interface {
	Embed(href, props string) (string, error)
	Preview(href, props string) (string, error)
}

type ConvertImage func(emb Embeddable, href, props string) (string, error)

var errorNoMatch = errors.New("could not embed this image")

type ImageEmbedder struct {
	es      []Embeddable
	imgRe   *regexp.Regexp
	propRe  *regexp.Regexp
	baseUrl string
	log     *zap.Logger
}

func NewImageEmbedder(proto, domain string, log *zap.Logger) *ImageEmbedder {
	e := &ImageEmbedder{
		imgRe:   regexp.MustCompile(`(?i)<img[^>]+>`),
		propRe:  regexp.MustCompile(`(?i)<img([^>]+)src="([^"]+)"([^>]*)>`),
		baseUrl: proto + "://" + domain,
		log:     log,
	}

	e.AddEmbeddable(NewZoomEmbed(e.baseUrl))
	e.AddEmbeddable(NewGifEmbed(e.baseUrl))
	e.AddEmbeddable(NewBaseEmbed())

	return e
}

func (e *ImageEmbedder) AddEmbeddable(emb Embeddable) {
	e.es = append(e.es, emb)
}

func (e *ImageEmbedder) PreviewAll(html string) string {
	return e.ConvertAll(html, Embeddable.Preview)
}

func (e *ImageEmbedder) EmbedAll(html string) string {
	return e.ConvertAll(html, Embeddable.Embed)
}

func (e *ImageEmbedder) ConvertAll(htmlText string, conv ConvertImage) string {
	return e.imgRe.ReplaceAllStringFunc(htmlText, func(tag string) string {
		match := e.propRe.FindAllStringSubmatch(tag, -1)
		if len(match) == 0 {
			return tag
		}

		props := match[0][1] + match[0][3]
		href := match[0][2]

		for _, emb := range e.es {
			res, err := conv(emb, href, props)
			if err == nil {
				return res
			}

			if !errors.Is(err, errorNoMatch) {
				e.log.Warn("images", zap.Error(err))
			}
		}

		return tag
	})
}

func GetQueryValues(href string, keys ...string) ([]string, error) {
	href = html.UnescapeString(href)
	u, err := url.Parse(href)
	if err != nil {
		return nil, err
	}

	v := u.Query()
	res := make([]string, len(keys))
	for i, k := range keys {
		val := v.Get(k)
		if len(val) > 0 {
			res[i] = val
		} else {
			return res, errorNoMatch
		}
	}

	return res, nil
}
