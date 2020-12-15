package embedder

import (
	"fmt"
	"regexp"
)

type ytProvider struct {
	OEmbedProvider
}

func newYouTube() EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?(?:m\.)?(?:youtube.com/watch\?.*v=|youtu.be/)([a-z0-9\-_]+).*`
	const apiUrl = "https://www.youtube.com/oembed?url="

	return &ytProvider{
		OEmbedProvider{
			hrefRe: regexp.MustCompile(hrefRe),
			apiUrl: apiUrl,
		},
	}
}

func (ytp *ytProvider) Load(href string) (Embeddable, error) {
	yt := ytp.hrefRe.FindAllStringSubmatch(href, -1)
	if len(yt) == 0 {
		return nil, errorNoMatch
	}

	id := yt[0][1]

	oe, err := ytp.OEmbedProvider.LoadChecked(href)
	if err != nil {
		return nil, err
	}

	const template = `<iframe class="embed" data-provider="YouTube" data-embed="%s" type="text/html" frameborder="0" width="480" height="270" 
	src="https://www.youtube.com/embed/%s?enablejsapi=1" allowfullscreen></iframe>`
	oe.Html = fmt.Sprintf(template, id, id)
	oe.ID = id

	return oe, nil
}
