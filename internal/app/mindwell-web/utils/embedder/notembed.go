package embedder

import (
	"time"
)

type NotEmbed struct {
	Tag string
}

func (ne NotEmbed) Embed() string {
	return ne.Tag
}

func (ne NotEmbed) Preview() string {
	return ne.Tag
}

func (ne NotEmbed) CacheControl() time.Duration {
	return 24 * time.Hour
}
