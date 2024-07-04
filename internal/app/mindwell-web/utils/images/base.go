package images

import (
	"fmt"
)

type baseEmbed struct {
}

func NewBaseEmbed() Embeddable {
	return &baseEmbed{}
}

func (b baseEmbed) Embed(href, props string) (string, error) {
	const a = `<a href="%s" target="__blank" class="js-zoom-image"><img src="%s" %s></a>`
	return fmt.Sprintf(a, href, href, props), nil
}

func (b baseEmbed) Preview(href, props string) (string, error) {
	return fmt.Sprintf(`<img src="%s" %s>`, href, props), nil
}
