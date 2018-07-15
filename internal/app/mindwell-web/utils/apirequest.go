package utils

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	"github.com/flosch/pongo2"
	"github.com/gin-gonic/gin"
)

type APIRequest struct {
	mdw  *Mindwell
	ctx  *gin.Context
	err  error
	resp *http.Response
	read bool // whether resp is read
	data map[string]interface{}
	uKey string
}

func NewRequest(mdw *Mindwell, ctx *gin.Context) *APIRequest {
	return &APIRequest{
		mdw:  mdw,
		ctx:  ctx,
		read: false,
	}
}

func (api *APIRequest) Error() error {
	return api.err
}

func (api *APIRequest) Data() map[string]interface{} {
	if api.err != nil {
		return nil
	}

	if api.data == nil {
		api.data = api.parseResponse()
	}

	return api.data
}

func (api *APIRequest) ClearData() {
	if api.err != nil {
		return
	}

	api.data = nil
}

func (api *APIRequest) SetData(key string, value interface{}) {
	if api.err != nil {
		return
	}

	data := api.Data()
	if data == nil {
		data = make(map[string]interface{})
		api.data = data
	}

	data[key] = value
}

func (api *APIRequest) SetScrollHrefs(webPath string) {
	api.SetScrollHrefsWithData(webPath, api.Data())
}

func (api *APIRequest) SetScrollHrefsWithData(webPath string, data map[string]interface{}) {
	_, setBefore := api.ctx.Params.Get("before")
	_, setAfter := api.ctx.Params.Get("after")

	if setBefore || setAfter == setBefore {
		if has, ok := data["hasBefore"].(bool); has && ok {
			if before, ok := data["nextBefore"].(string); ok {
				href := webPath + "?before=" + before
				api.SetData("beforeHref", href)
			}
		}
	}

	if setAfter || setAfter == setBefore {
		afterHref := webPath
		if after, ok := data["nextAfter"].(string); ok {
			afterHref += "?after=" + after
		}
		api.SetData("afterHref", afterHref)
	}
}

func (api *APIRequest) setUserKey() {
	if api.err != nil {
		return
	}

	if len(api.uKey) > 0 {
		return
	}

	var token *http.Cookie
	token, api.err = api.ctx.Request.Cookie("api_token")
	if api.err != nil {
		api.ctx.Redirect(http.StatusSeeOther, "/index.html")
		return
	}

	api.uKey = token.Value
}

func (api *APIRequest) do(req *http.Request) {
	if api.mdw.DevMode {
		log.Print(req.Method + " " + req.URL.String())
	}

	api.resp, api.err = http.DefaultTransport.RoundTrip(req)
	if api.err != nil {
		log.Print(api.err)
	}

	api.read = false
}

func (api *APIRequest) ClearCookie() {
	token := &http.Cookie{
		Name:     "api_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
	}
	http.SetCookie(api.ctx.Writer, token)

	api.err = http.ErrNoCookie
}

func (api *APIRequest) checkError() {
	if api.err != nil || api.resp == nil {
		return
	}

	code := api.resp.StatusCode
	switch {
	case code == 401:
		api.ClearCookie()
		api.Redirect("/index.html")
	case code >= 400:
		log.Print(api.resp.Status)
		api.err = http.ErrNotSupported
	}
}

func (api *APIRequest) Get(path string) {
	api.setUserKey()
	if api.err != nil {
		return
	}

	var req *http.Request
	url := api.mdw.url + path
	req, api.err = http.NewRequest("GET", url, nil)
	if api.err != nil {
		api.ctx.Writer.WriteString(api.err.Error())
		return
	}

	req.Header.Add("X-User-Key", api.uKey)

	api.do(req)
	api.checkError()
}

func (api *APIRequest) copyRequestToHost(path, host string) *http.Request {
	req := api.ctx.Request.WithContext(api.ctx.Request.Context())
	req.URL.Scheme = api.mdw.scheme
	req.URL.Host = host
	req.URL.Path = api.mdw.path + path
	req.Close = false

	req.Header = make(map[string][]string)
	headers := [...]string{"Accept", "Content-Length", "Content-Type", "Host"}
	for _, k := range headers {
		vv := api.ctx.Request.Header[k]
		vv2 := make([]string, len(vv))
		copy(vv2, vv)
		req.Header[k] = vv2
	}

	return req
}

func (api *APIRequest) copyRequest(path string) *http.Request {
	return api.copyRequestToHost(path, api.mdw.host)
}

func (api *APIRequest) MethodForwardToHost(method, path, host string) {
	api.setUserKey()
	if api.err != nil {
		return
	}

	req := api.copyRequestToHost(path, host)
	req.Header.Set("X-User-Key", api.uKey)
	req.Method = method

	api.do(req)
	api.checkError()
}

func (api *APIRequest) MethodForwardToImages(method, path string) {
	api.MethodForwardToHost(method, path, api.mdw.imgHost)
}

func (api *APIRequest) MethodForwardTo(method, path string) {
	api.MethodForwardToHost(method, path, api.mdw.host)
}

func (api *APIRequest) MethodForward(method string) {
	api.MethodForwardTo(method, api.ctx.Request.URL.Path)
}

func (api *APIRequest) ForwardTo(path string) {
	api.MethodForwardTo(api.ctx.Request.Method, path)
}

func (api *APIRequest) Forward() {
	api.ForwardTo(api.ctx.Request.URL.Path)
}

func (api *APIRequest) ForwardToNotAuthorized(path string) {
	req := api.copyRequest(path)
	api.do(req)
	if api.err != nil {
		return
	}

	if api.resp.StatusCode >= 400 {
		api.WriteTemplate("error")
		api.err = http.ErrNoCookie
	}
}

func (api *APIRequest) ForwardNotAuthorized() {
	api.ForwardToNotAuthorized(api.ctx.Request.URL.Path)
}

func (api *APIRequest) ForwardToNoCookie(path string) {
	req := api.copyRequest(path)
	api.do(req)
}

func (api *APIRequest) SetField(key, path string) {
	if api.err != nil {
		return
	}

	if api.data == nil {
		api.data = api.parseResponse()
	}

	if api.err != nil {
		return
	}

	if api.data == nil {
		api.data = map[string]interface{}{}
	}

	api.Get(path)
	api.data[key] = api.parseResponse()
}

func (api *APIRequest) SetMe() {
	api.SetField("me", "/me")
}

func (api *APIRequest) readResponse() []byte {
	if api.resp == nil || api.read {
		return nil
	}

	api.read = true

	var jsonData []byte
	jsonData, api.err = ioutil.ReadAll(api.resp.Body)
	api.resp.Body.Close()
	if api.err != nil {
		log.Print(api.err)
	}

	return jsonData
}

func (api *APIRequest) parseResponse() map[string]interface{} {
	jsonData := api.readResponse()
	if len(jsonData) == 0 {
		return nil
	}

	decoder := json.NewDecoder(bytes.NewBuffer(jsonData))
	decoder.UseNumber()
	var data map[string]interface{}
	api.err = decoder.Decode(&data)
	if api.err == nil {
		return data
	}

	log.Print(api.err)
	log.Print(string(jsonData))

	return data
}

func (api *APIRequest) setErrorCode() {
	if api.data == nil {
		api.data = map[string]interface{}{}
	}

	code := api.data["code"]
	if code != nil {
		return
	}

	if api.resp.StatusCode >= 400 {
		code = api.resp.StatusCode
	} else {
		code = 500
	}

	api.data["code"] = code
}

func (api *APIRequest) WriteTemplate(name string) {
	if api.err == http.ErrNotSupported {
		name = "error"
		api.setErrorCode()
	} else if api.err != nil {
		return
	}

	var templ *pongo2.Template
	templ, api.err = api.mdw.Template(name)
	if api.err != nil {
		return
	}

	if api.resp != nil {
		api.ctx.Status(api.resp.StatusCode)
	}

	api.ctx.Header("Cache-Control", "private")
	api.ctx.Header("Content-Type", "text/html; charset=utf-8")

	templ.ExecuteWriter(pongo2.Context(api.Data()), api.ctx.Writer)
}

func (api *APIRequest) WriteResponse() {
	jsonData := api.readResponse()
	if api.resp == nil {
		return
	}

	for k, vv := range api.resp.Header {
		for _, v := range vv {
			api.ctx.Header(k, v)
		}
	}

	api.ctx.Status(api.resp.StatusCode)

	if jsonData != nil {
		api.ctx.Writer.Write(jsonData)
	}
}

func (api *APIRequest) Redirect(path string) {
	if api.err != nil {
		api.WriteTemplate("error")
		return
	}

	api.ctx.Redirect(http.StatusSeeOther, path)
}

func (api *APIRequest) IsAjax() bool {
	with := api.ctx.GetHeader("X-Requested-With")
	return with == "XMLHttpRequest"
}
