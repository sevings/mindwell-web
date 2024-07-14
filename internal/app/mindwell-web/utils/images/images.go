package images

import (
	"errors"
	"github.com/patrickmn/go-cache"
	"github.com/sevings/mindwell-web/internal/app/mindwell-web/utils"
	"go.uber.org/zap"
	"net/http"
	"regexp"
	"time"
)

type ImageData struct {
	Embed   string
	Preview string
	Exp     time.Duration
	access  time.Time
	load    time.Time
}

func (data *ImageData) isUsed() bool {
	return data.access.Add(180 * 24 * time.Hour).After(time.Now())
}

func (data *ImageData) isExpired() bool {
	return data.load.Add(data.Exp).Before(time.Now())
}

func NewImageData(tag string) *ImageData {
	return &ImageData{
		Embed:   tag,
		Preview: tag,
	}
}

type ImageProvider interface {
	Load(href, props string) (*ImageData, error)
}

var errorNoMatch = errors.New("could not embed this image")

type ImageEmbedder struct {
	es     []ImageProvider
	cache  *cache.Cache
	imgRe  *regexp.Regexp
	propRe *regexp.Regexp
	log    *zap.Logger
}

func NewImageEmbedder(m *utils.Mindwell, log *zap.Logger) *ImageEmbedder {
	e := &ImageEmbedder{
		cache:  cache.New(180*24*time.Hour, 24*time.Hour),
		imgRe:  regexp.MustCompile(`(?i)<img[^>]+>`),
		propRe: regexp.MustCompile(`(?i)<img([^>]+)src="([^"]+)"([^>]*)>`),
		log:    log,
	}

	e.cache.OnEvicted(func(tag string, cached interface{}) {
		data := cached.(*ImageData)

		if data.access.After(data.load) {
			e.reload(tag, data)
			return
		}

		if data.isUsed() {
			e.cache.SetDefault(tag, data)
		}
	})

	cli := &http.Client{Timeout: 2 * time.Second}

	e.AddImageProvider(NewMindwellProvider(m, cli))
	e.AddImageProvider(NewBaseEmbed())

	return e
}

func (e *ImageEmbedder) AddImageProvider(emb ImageProvider) {
	e.es = append(e.es, emb)
}

func (e *ImageEmbedder) EmbedAll(html string) string {
	return e.imgRe.ReplaceAllStringFunc(html, func(tag string) string {
		return e.Convert(tag).Embed
	})
}

func (e *ImageEmbedder) PreviewAll(html string) string {
	return e.imgRe.ReplaceAllStringFunc(html, func(tag string) string {
		return e.Convert(tag).Preview
	})
}

func (e *ImageEmbedder) Convert(tag string) *ImageData {
	var data *ImageData

	cached, found := e.cache.Get(tag)
	if found {
		data = cached.(*ImageData)
		if data.isExpired() {
			go e.reload(tag, data)
		}
	} else {
		data = NewImageData(tag)
		e.reload(tag, data)
	}

	data.access = time.Now()

	return data
}

func (e *ImageEmbedder) reload(tag string, data *ImageData) {
	match := e.propRe.FindAllStringSubmatch(tag, -1)
	if len(match) == 0 {
		return
	}

	props := match[0][1] + match[0][3]
	href := match[0][2]

	e.log.Info("images",
		zap.String("act", "load"),
		zap.String("url", href))

	var img *ImageData
	var err error

	for _, ep := range e.es {
		img, err = ep.Load(href, props)
		if err == nil {
			break
		}
		if !errors.Is(err, errorNoMatch) {
			e.log.Warn("images", zap.Error(err))
		}
	}

	if img == nil || err != nil {
		return
	}

	data.Embed = img.Embed
	data.Preview = img.Preview
	data.Exp = img.Exp
	data.load = time.Now()

	if data.Exp > 0 {
		e.cache.Set(tag, data, data.Exp)
	}
}
