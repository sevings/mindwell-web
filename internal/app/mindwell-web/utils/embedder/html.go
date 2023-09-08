package embedder

import (
	"fmt"
	"github.com/sevings/mindwell-server/utils"
	"golang.org/x/net/html/charset"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type htmlEmbed struct {
	html string
}

func (h htmlEmbed) Embed() string {
	return h.html
}

func (h htmlEmbed) Preview() string {
	return h.html
}

func (h htmlEmbed) CacheControl() time.Duration {
	return 24 * time.Hour
}

type htmlProvider struct {
	titleRe *regexp.Regexp
	cli     *http.Client
}

func newHtmlProvider(cli *http.Client) *htmlProvider {
	return &htmlProvider{
		titleRe: regexp.MustCompile(`(?i)<title[^>]*>([^<]*)</title>`),
		cli:     cli,
	}
}

func (hp *htmlProvider) Load(href string) (Embeddable, error) {
	req, err := http.NewRequest("GET", href, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "text/html, application/xhtml+xml")
	req.Header.Set("User-Agent", "mindwell-web")

	resp, err := hp.cli.Do(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, errorNoMatch
	}

	contentType := resp.Header.Get("content-type")
	if !strings.Contains(contentType, "html") {
		return nil, errorNoMatch
	}

	defer resp.Body.Close()
	htmlReader, err := charset.NewReader(resp.Body, contentType)
	if err != nil {
		return nil, err
	}

	html, err := io.ReadAll(htmlReader)
	if err != nil {
		return nil, err
	}

	match := hp.titleRe.FindSubmatch(html)
	if len(match) == 0 {
		return nil, errorNoMatch
	}

	title := string(match[1])
	title, _ = utils.CutText(title, 100)

	tag := fmt.Sprintf(`<a href="%s" target="_blank">%s</a>`, href, title)
	return &htmlEmbed{html: tag}, nil
}
