package embedder

import (
	"crypto/md5"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/sevings/mindwell-server/utils"
	"io/ioutil"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type OEmbed struct {
	Html         string `json:"html"`
	Title        string `json:"title"`
	ThumbnailUrl string `json:"thumbnail_url"`
	AuthorName   string `json:"author_name"`
	AuthorUrl    string `json:"author_url"`
	Description  string `json:"description"`
	ProviderName string `json:"provider_name"`
	Type         string `json:"type"`
	Url          string `json:"url"`
	CacheAge     int64  `json:"cache_age"`
	ID           string
}

type OEmbedProvider struct {
	hrefRe *regexp.Regexp
	apiUrl string
}

func NewOEmbedProvider(hrefRe, apiUrl string) *OEmbedProvider {
	return &OEmbedProvider{
		hrefRe: regexp.MustCompile(hrefRe),
		apiUrl: apiUrl,
	}
}

func (oep *OEmbedProvider) Load(href string) (Embeddable, error) {
	if !oep.hrefRe.MatchString(href) {
		return nil, errorNoMatch
	}

	resp, err := http.Get(oep.apiUrl + href)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, errorNotEmbed
	}

	var jsonData []byte
	defer resp.Body.Close()
	jsonData, err = ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	oembed := &OEmbed{}
	err = json.Unmarshal(jsonData, oembed)
	if err != nil {
		return nil, err
	}

	oembed.Description, _ = utils.CutText(oembed.Description, 200)

	if oembed.Url == "" {
		oembed.Url = href
	}

	sum := md5.Sum([]byte(oembed.Url))
	oembed.ID = base64.URLEncoding.EncodeToString(sum[:])

	const template = `<iframe class="embed" data-provider="%s" data-embed="%s"`
	htmlStart := fmt.Sprintf(template, oembed.ProviderName, oembed.ID)
	oembed.Html = strings.Replace(oembed.Html, "<iframe", htmlStart, 1)

	return oembed, nil
}

func (oe *OEmbed) Embed() string {
	return oe.Html
}

func (oe *OEmbed) PreviewVideo() string {
	const template = `							
<div class="post-video">
	<div class="video-thumb">
		<img src="%s" alt="photo">
		<a href="%s" class="open-embed play-video" target="_blank" data-embed="%s">
			<svg class="olymp-play-icon"><use xlink:href="/assets/olympus/svg-icons/sprites/icons.svg#olymp-play-icon"></use></svg>
		</a>
	</div>

	<div class="video-content">
		<a href="%s" class="h4 title">%s</a>
		<p>%s</p>
		<a href="%s" class="link-site">%s</a>
	</div>
</div>
`

	return fmt.Sprintf(template, oe.ThumbnailUrl, oe.Url, oe.ID, oe.Url, oe.Title, oe.Description, oe.Url, oe.ProviderName)
}

func (oe *OEmbed) PreviewRich() string {
	const template = `							
<div class="post-video">
	<div class="video-content">
		<a href="%s" class="h4 title">%s</a>
		<p>%s</p>
		<a href="%s" class="link-site">%s</a>
	</div>
</div>
`

	return fmt.Sprintf(template, oe.Url, oe.Title, oe.Description, oe.Url, oe.ProviderName)
}

func (oe *OEmbed) Preview() string {
	if oe.Type == "video" {
		return oe.PreviewVideo()
	} else {
		return oe.PreviewRich()
	}
}

func (oe *OEmbed) CacheControl() time.Duration {
	if oe.CacheAge > 0 {
		return time.Duration(oe.CacheAge) * time.Second
	}

	return 720 * time.Hour
}
