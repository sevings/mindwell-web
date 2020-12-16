package embedder

func newCoub() EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?coub\.com.+`
	const apiUrl = "http://coub.com/api/oembed.json?url="
	return NewOEmbedProvider(hrefRe, apiUrl)
}

func newSoundCloud() EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?soundcloud\.com.+`
	const apiUrl = "https://soundcloud.com/oembed?format=json&show_comments=false&url="
	return NewOEmbedProvider(hrefRe, apiUrl)
}

func newTickCounter() EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?tickcounter\.com.+`
	const apiUrl = "https://www.tickcounter.com/oembed?format=json&url="
	return NewOEmbedProvider(hrefRe, apiUrl)
}

func newVimeo() EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?vimeo\.com.+`
	const apiUrl = "https://vimeo.com/api/oembed.json?url="
	return NewOEmbedProvider(hrefRe, apiUrl)
}
