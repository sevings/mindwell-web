package utils

import (
	"net/http"
	"strconv"
	"strings"
)

type FieldFunc func(req *http.Request) uint16

type BrowserIDBuilder struct {
	fields []FieldFunc
}

func NewDefaultBrowserIDBuilder() BrowserIDBuilder {
	var b BrowserIDBuilder

	b.AddField(HeaderFieldFunc("User-Agent"))
	b.AddField(HeaderFieldFunc("Accept"))
	b.AddField(HeaderFieldFunc("Accept-Encoding"))
	b.AddField(HeaderFieldFunc("Accept-Language"))

	return b
}

func (b *BrowserIDBuilder) AddField(f FieldFunc) {
	b.fields = append(b.fields, f)
}

func (b BrowserIDBuilder) Build(req *http.Request) BrowserID {
	var id BrowserID

	for _, f := range b.fields {
		val := f(req)
		id = append(id, val)
	}

	return id
}

type BrowserID []uint16

func IDFromString(idStr string) (BrowserID, error) {
	var id BrowserID

	for i := 0; i < len(idStr)/4; i++ {
		f := idStr[i*4 : i*4+4]
		v, err := strconv.ParseInt(f, 16, 16)
		if err != nil {
			return nil, err
		}

		id = append(id, uint16(v))
	}

	return id, nil
}

func (id BrowserID) String() string {
	var b strings.Builder
	b.Grow(len(id) * 4)

	for _, f := range id {
		v := strconv.FormatUint(uint64(f), 16)

		for i := len(v); i < 4; i++ {
			b.WriteByte('0')
		}

		b.WriteString(v)
	}

	return b.String()
}

func (id BrowserID) Compare(other BrowserID) uint {
	var diff uint

	minLen := len(id)
	if minLen > len(other) {
		minLen = len(other)
	}

	for i := 0; i < minLen; i++ {
		f1 := id[i]
		f2 := other[i]

		if f1 != f2 {
			diff++
		}
	}

	return diff
}

func HeaderFieldFunc(key string) FieldFunc {
	return func(req *http.Request) uint16 {
		val := []byte(req.Header.Get(key))

		var sum uint16
		for i, b := range val {
			sum += uint16(i+1) * uint16(b)
		}

		return sum
	}
}

func CookieFieldFunc(key string) FieldFunc {
	return func(req *http.Request) uint16 {
		c, err := req.Cookie(key)
		if err != nil {
			return 0
		}

		val := c.Value

		var sum uint16
		for i, b := range val {
			sum += uint16(i+1) * uint16(b)
		}

		return sum
	}
}

func CookieNumberFieldFunc(key string) FieldFunc {
	return func(req *http.Request) uint16 {
		c, err := req.Cookie(key)
		if err != nil {
			return 0
		}

		val, err := strconv.ParseInt(c.Value, 10, 16)
		if err != nil {
			return 0
		}

		if val < 0 {
			val = (1 << 16) + val
		}

		return uint16(val)
	}
}
