package images

import (
	"fmt"
	"strings"
)

type zoomEmbed struct {
	baseUrl string
}

func NewZoomEmbed(baseUrl string) Embeddable {
	return &zoomEmbed{
		baseUrl: baseUrl,
	}
}

func (e zoomEmbed) Embed(href, props string) (string, error) {
	if !strings.HasPrefix(href, e.baseUrl) {
		return "", errorNoMatch
	}

	values, err := GetQueryValues(href, "mu", "lu", "mw", "mh")
	if err != nil {
		return "", err
	}

	mediumUrl := values[0]
	largeUrl := values[1]
	w := values[2]
	h := values[3]

	const html = `
<a href="%s" target="__blank" class="post-thumb js-zoom-image">
	<img src="%s" %s
		srcset="%s, %s 1.5x"
		width="%s" height="%s">
</a>
`

	return fmt.Sprintf(html, largeUrl, mediumUrl, props, mediumUrl, largeUrl, w, h), nil
}

func (e zoomEmbed) Preview(href, props string) (string, error) {
	if !strings.HasPrefix(href, e.baseUrl) {
		return "", errorNoMatch
	}

	values, err := GetQueryValues(href, "su", "mu", "lu", "sw", "sh")
	if err != nil {
		return "", err
	}

	smallUrl := values[0]
	mediumUrl := values[1]
	largeUrl := values[2]
	w := values[3]
	h := values[4]

	const html = `
<img src="%s" %s
	srcset="%s, %s 2x, %s 3x"
	width="%s" height="%s">
`

	return fmt.Sprintf(html, smallUrl, props, smallUrl, mediumUrl, largeUrl, w, h), nil
}
