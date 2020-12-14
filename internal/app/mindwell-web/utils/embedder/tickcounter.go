package embedder

func newTickCounter() EmbeddableProvider {
	const hrefRe = `(?i)(?:https?://)?(?:www\.)?tickcounter\.com.+`
	const apiUrl = "https://www.tickcounter.com/oembed?format=json&url="
	return NewOEmbedProvider(hrefRe, apiUrl)
}
