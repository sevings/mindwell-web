package images

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/sevings/mindwell-server/models"
	"github.com/sevings/mindwell-web/internal/app/mindwell-web/utils"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type mindwellProvider struct {
	cli     *http.Client
	mi      *utils.Mindwell
	baseUrl string
	apiUrl  string
}

func NewMindwellProvider(m *utils.Mindwell, cli *http.Client) ImageProvider {
	return &mindwellProvider{
		cli: cli,
		mi:  m,
		baseUrl: m.ConfigString("images.proto") + "://" +
			m.ConfigString("images.domain"),
		apiUrl: m.ImgApiUrl() + "/images/find?link=",
	}
}

func (e *mindwellProvider) Load(href, props string) (*ImageData, error) {
	if !strings.HasPrefix(href, e.baseUrl) {
		return nil, errorNoMatch
	}

	info, err := e.loadImageInfo(href)
	if err != nil {
		return nil, err
	}

	var img *ImageData

	if info.IsAnimated {
		img, err = e.getAnimated(info, props)
	} else {
		img, err = e.getStatic(info, props)
	}
	if err != nil {
		return nil, err
	}

	if !info.Processing {
		img.Exp = 180 * 24 * time.Hour
	}

	return img, nil
}

func (e *mindwellProvider) loadImageInfo(href string) (*models.Image, error) {
	href = strings.SplitN(href, "?", 2)[0]
	href = url.QueryEscape(href)
	req, err := http.NewRequest(http.MethodGet, e.apiUrl+href, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+e.mi.AppToken())
	resp, err := e.cli.Do(req)
	if err != nil {
		return nil, err
	}

	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New(string(body))
	}

	var imgInfo = &models.Image{}
	err = json.Unmarshal(body, imgInfo)
	if err != nil {
		return nil, err
	}

	return imgInfo, nil
}

func (e *mindwellProvider) getAnimated(info *models.Image, props string) (*ImageData, error) {
	img := &ImageData{}

	{
		preview := info.Large.Preview
		gif := info.Large.URL
		w := info.Large.Width
		h := info.Large.Height

		const tag = `
<div class="post-thumb">
	<img class="gif-play-image" data-gif="%s" data-scope="attached" 
		src="%s" %s
		width="%d" height="%d">
</div>
`

		img.Embed = fmt.Sprintf(tag, gif, preview, props, w, h)
	}

	{
		preview := info.Medium.Preview
		gif := info.Medium.URL
		w := info.Medium.Width
		h := info.Medium.Height

		const tag = `
<img class="gif-play-image" data-gif="%s" data-scope="attached" 
	src="%s" %s
	width="%d" height="%d">
`

		img.Preview = fmt.Sprintf(tag, gif, preview, props, w, h)
	}

	return img, nil
}

func (e *mindwellProvider) getStatic(info *models.Image, props string) (*ImageData, error) {
	img := &ImageData{}

	{
		mediumUrl := info.Medium.URL
		largeUrl := info.Large.URL
		w := info.Medium.Width
		h := info.Medium.Height

		const tag = `
<a href="%s" target="__blank" class="post-thumb js-zoom-image">
	<img src="%s" %s
		srcset="%s, %s 1.5x"
		width="%d" height="%d">
</a>
`

		img.Embed = fmt.Sprintf(tag, largeUrl, mediumUrl, props, mediumUrl, largeUrl, w, h)
	}

	{
		smallUrl := info.Small.URL
		mediumUrl := info.Medium.URL
		largeUrl := info.Large.URL
		w := info.Small.Width
		h := info.Small.Height

		const tag = `
<img src="%s" %s
	srcset="%s, %s 2x, %s 3x"
	width="%d" height="%d">
`

		img.Preview = fmt.Sprintf(tag, smallUrl, props, smallUrl, mediumUrl, largeUrl, w, h)
	}

	return img, nil
}
