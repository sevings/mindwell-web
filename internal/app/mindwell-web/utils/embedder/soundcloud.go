package embedder

func newSoundCloud() EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?soundcloud\.com.+`
	const apiUrl = "https://soundcloud.com/oembed?format=json&maxheight=166&show_comments=false&url="
	return NewOEmbedProvider(hrefRe, apiUrl)
}
