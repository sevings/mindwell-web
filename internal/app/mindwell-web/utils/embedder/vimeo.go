package embedder

func newVimeo() EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?vimeo\.com.+`
	const apiUrl = "https://vimeo.com/api/oembed.json?url="
	return NewOEmbedProvider(hrefRe, apiUrl)
}
