package embedder

import (
	"fmt"
	"regexp"
	"time"
)

type yamEmbed struct {
	tag string
}

func newYamEmbed(href string) *yamEmbed {
	return &yamEmbed{
		tag: fmt.Sprintf(`<a href="%s" target="_blank">Яндекс Музыка</a>`, href),
	}
}

func (yam yamEmbed) Embed() string {
	return yam.tag
}

func (yam yamEmbed) Preview() string {
	return yam.tag
}

func (yam yamEmbed) CacheControl() time.Duration {
	return 720 * time.Hour
}

type yamProvider struct {
	hrefRe *regexp.Regexp
}

func newYandexMusic() *yamProvider {
	return &yamProvider{
		hrefRe: regexp.MustCompile(`^(?i)(?:https://)?music.yandex.(?:ru|com|kz|ua)/`),
	}
}

func (mp *yamProvider) Load(href string) (Embeddable, error) {
	match := mp.hrefRe.FindStringSubmatch(href)
	if len(match) == 0 {
		return nil, errorNoMatch
	}

	return newYamEmbed(href), nil
}
