package embedder

func newCoub() EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?coub\.com.+`
	const apiUrl = "http://coub.com/api/oembed.json?url="
	return NewOEmbedProvider(hrefRe, apiUrl)
}
