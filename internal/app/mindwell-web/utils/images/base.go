package images

import (
	"fmt"
	"time"
)

type baseEmbed struct {
}

func NewBaseEmbed() ImageProvider {
	return &baseEmbed{}
}

func (b baseEmbed) Load(href, props string) (*ImageData, error) {
	data := &ImageData{}

	const a = `<a href="%s" target="__blank" class="js-zoom-image"><img src="%s" %s></a>`
	data.Embed = fmt.Sprintf(a, href, href, props)

	const img = `<img src="%s" %s>`
	data.Preview = fmt.Sprintf(img, href, props)

	data.Exp = 24 * time.Hour

	return data, nil
}
