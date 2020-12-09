package embedder

import (
	"fmt"
	"regexp"
	"time"
)

type ytEmbeddable struct {
	id string
}

type ytProvider struct {
	ytRe *regexp.Regexp
}

func newYouTube() *ytProvider {
	return &ytProvider{
		ytRe: regexp.MustCompile(`(?i)(?:https?://)?(?:www\.)?(?:m\.)?(?:youtube.com/watch\?.*v=|youtu.be/)([a-z0-9\-_]+).*`),
	}
}

func (ytp *ytProvider) Load(href string) (Embeddable, error) {
	yt := ytp.ytRe.FindAllStringSubmatch(href, -1)
	if len(yt) == 0 {
		return nil, errorNoMatch
	}

	id := yt[0][1]
	return &ytEmbeddable{id: id}, nil
}

func (yte *ytEmbeddable) Embed() string {
	return fmt.Sprintf(`<iframe class="embed" data-type="youtube" data-embed="%s" type="text/html" frameborder="0" width="480" height="270" 
	src="https://www.youtube.com/embed/%s?enablejsapi=1" allowfullscreen></iframe>`, yte.id, yte.id)
}

func (yte *ytEmbeddable) Preview() string {
	return fmt.Sprintf(`<div class="post-video">
		<div class="video-thumb f-none">
			<img src="https://img.youtube.com/vi/%s/0.jpg" alt="video">
			<a href="https://youtube.com/watch?v=%s" class="open-embed play-video" target="_blank" data-embed="%s">
				<svg class="olymp-play-icon"><use xlink:href="/assets/olympus/svg-icons/sprites/icons.svg#olymp-play-icon"></use></svg>
			</a>
		</div>
	</div>`, yte.id, yte.id, yte.id)
}

func (yte *ytEmbeddable) CacheControl() time.Duration {
	return 1 * time.Hour
}
