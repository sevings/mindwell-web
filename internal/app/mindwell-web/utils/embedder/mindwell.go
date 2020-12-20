package embedder

import (
	"fmt"
	"regexp"
	"time"
)

type mindwellEmbed struct {
	tag string
}

func newMindwellEmbed(href, title string) *mindwellEmbed {
	return &mindwellEmbed{
		tag: fmt.Sprintf(`<a href="%s" target="_blank">%s</a>`, href, title),
	}
}

func (mwe mindwellEmbed) Embed() string {
	return mwe.tag
}

func (mwe mindwellEmbed) Preview() string {
	return mwe.tag
}

func (mwe mindwellEmbed) CacheControl() time.Duration {
	return 720 * time.Hour
}

type mindwellProvider struct {
	domain string
	hrefRe *regexp.Regexp
}

func newMindwell(domain string) *mindwellProvider {
	return &mindwellProvider{
		domain: domain,
		hrefRe: regexp.MustCompile(`(?i)(?:https?://)?(?:www\.)?([^/]+)/([^/]+)(?:/([^/]+))?.*`),
	}
}

func (mp *mindwellProvider) Load(href string) (Embeddable, error) {
	match := mp.hrefRe.FindStringSubmatch(href)
	if len(match) == 0 {
		return nil, errorNoMatch
	}

	domain := match[1]
	if domain != mp.domain {
		return nil, errorNoMatch
	}

	dir := match[2]
	switch dir {
	case "entries":
		return newMindwellEmbed(href, "Запись — Mindwell"), nil
	case "users":
		user := match[3]
		if len(user) > 0 {
			return newMindwellEmbed(href, user+" — Mindwell"), nil
		}
	}

	return nil, errorNoMatch
}
