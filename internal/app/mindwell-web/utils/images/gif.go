package images

import (
	"fmt"
	"strings"
)

type gifEmbed struct {
	baseUrl string
}

func NewGifEmbed(baseUrl string) Embeddable {
	return &gifEmbed{
		baseUrl: baseUrl,
	}
}

func (e gifEmbed) Embed(href, props string) (string, error) {
	if !strings.HasPrefix(href, e.baseUrl) {
		return "", errorNoMatch
	}

	values, err := GetQueryValues(href, "mp", "mu", "mw", "mh")
	if err != nil {
		return "", err
	}

	preview := values[0]
	gif := values[1]
	w := values[2]
	h := values[3]

	const html = `
<div class="post-thumb">
	<img class="gif-play-image" data-gif="%s" data-scope="attached" 
		src="%s" %s
		width="%s" height="%s">
</div>
`

	return fmt.Sprintf(html, gif, preview, props, w, h), nil
}

func (e gifEmbed) Preview(href, props string) (string, error) {
	if !strings.HasPrefix(href, e.baseUrl) {
		return "", errorNoMatch
	}

	values, err := GetQueryValues(href, "mp", "mu", "mw", "mh")
	if err != nil {
		return "", err
	}

	preview := values[0]
	gif := values[1]
	w := values[2]
	h := values[3]

	const html = `
<img class="gif-play-image" data-gif="%s" data-scope="attached" 
	src="%s" %s
	width="%s" height="%s">
`

	return fmt.Sprintf(html, gif, preview, props, w, h), nil
}
