package embedder

import (
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
	Url          string
	ID           int64
}

type scEmbeddable OEmbed

type scProvider struct {
	scRe *regexp.Regexp
	http *http.Client
}

func newSoundCloud() *scProvider {
	return &scProvider{
		scRe: regexp.MustCompile(`(?i)(?:https?://)?(?:www\.)?soundcloud\.com.+`),
		http: http.DefaultClient,
	}
}

func (scp *scProvider) Load(href string) (Embeddable, error) {
	if !scp.scRe.MatchString(href) {
		return nil, errorNoMatch
	}

	const oembedUrl = "https://soundcloud.com/oembed?format=json&maxheight=166&show_comments=false&url="
	url := oembedUrl + href
	resp, err := scp.http.Get(url)
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

	sce := &scEmbeddable{}
	err = json.Unmarshal(jsonData, &sce)
	if err != nil {
		return nil, err
	}

	const templ = `<iframe class="embed" data-type="soundcloud" data-embed="%p"`
	sce.Html = strings.Replace(sce.Html, "<iframe", fmt.Sprintf(templ, sce), 1)
	sce.Description, _ = utils.CutText(sce.Description, 200)
	sce.Url = href

	//<iframe width="100%" height="400" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F941391109&show_artwork=true&in_system_playlist=charts-trending%3Aclassical%3Aru"></iframe>

	return sce, nil
}

func (sce *scEmbeddable) Embed() string {
	return sce.Html
}

func (sce *scEmbeddable) Preview() string {
	const templ = `							
<div class="post-video">
	<div class="video-thumb">
		<img src="%s" alt="photo">
		<a href="%s" class="open-embed play-video" target="_blank" data-embed="%p">
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

	return fmt.Sprintf(templ, sce.ThumbnailUrl, sce.Url, sce, sce.Url, sce.Title, sce.Description, sce.Url, sce.ProviderName)
}

func (sce *scEmbeddable) CacheControl() time.Duration {
	return 120 * time.Hour
}
