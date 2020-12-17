package embedder

import (
	"net/http"
)

func newCoub(cli *http.Client) EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?coub\.com.+`
	const apiUrl = "http://coub.com/api/oembed.json?url="
	return NewOEmbedProvider(hrefRe, apiUrl, cli)
}

func newSoundCloud(cli *http.Client) EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?soundcloud\.com.+`
	const apiUrl = "https://soundcloud.com/oembed?format=json&show_comments=false&url="
	return NewOEmbedProvider(hrefRe, apiUrl, cli)
}

func newTickCounter(cli *http.Client) EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?tickcounter\.com.+`
	const apiUrl = "https://www.tickcounter.com/oembed?format=json&url="
	return NewOEmbedProvider(hrefRe, apiUrl, cli)
}

func newVimeo(cli *http.Client) EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?vimeo\.com.+`
	const apiUrl = "https://vimeo.com/api/oembed.json?url="
	return NewOEmbedProvider(hrefRe, apiUrl, cli)
}
