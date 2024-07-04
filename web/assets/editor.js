store = new window.Basil();

function titleElem()         { return $("input[name='title']") }
function contentElem()       { return $("textarea[name='content']") }
function privacyElem()       { return $("select[name='privacy']") }
function isCommentableElem() { return $("input[type='checkbox'][name='isCommentable']") }
function isVotableElem()     { return $("input[name='isVotable']") }
function isAnonymousElem()   { return $("input[name='isAnonymous']") }
function inLiveElem()        { return $("input[name='inLive']") }
function isSharedElem()      { return $("input[name='isShared']") }
function isDraftElem()       { return $("input[name='isDraft']") }
function imagesElem()        { return $("input[name='images']") }
function tagsElem()          { return $("input[name='tags']") }

function entryId()           { return parseInt($("#entry-editor").data("entryId")) }
function isCreating()        { return entryId() <= 0 }
function draftName()         { return "draft" + $("#entry-editor").data("themeId") }

function storeDraft() {
    let draft = {
        title         : titleElem().val(),
        content       : contentElem().val(),
        tags          : tagsElem().val(),
        privacy       : privacyElem().val(),
        images        : imagesElem().val(),
        isCommentable : isCommentableElem().prop("checked"),
        isVotable     : isVotableElem().prop("checked"),
        inLive        : inLiveElem().prop("checked"),
        isShared      : isSharedElem().prop("checked"),
        isAnonymous   : isAnonymousElem().prop("checked"),
    }

    store.set(draftName(), draft)
}

function loadDraft() {
    let draft = store.get(draftName())
    if(!draft)
        return

    if(draft.title)
        titleElem().val(draft.title)

    if(draft.content)
        contentElem().val(draft.content)

    if(draft.tags)
        tagsElem().val(draft.tags)

    if(draft.images) {
        imagesElem().val(draft.images)
        loadImages()
    }

    privacyElem().val(draft.privacy)
    $('.selectpicker').selectpicker('refresh');

    isCommentableElem().prop("checked", draft.isCommentable)
    isVotableElem().prop("checked", draft.isVotable)
    inLiveElem().prop("checked", draft.inLive)
    isSharedElem().prop("checked", draft.isShared)
    isAnonymousElem().prop("checked", draft.isAnonymous)
}

function removeDraft() {
    let draft = {
        privacy       : privacyElem().val(),
        isCommentable : isCommentableElem().prop("checked"),
        isVotable     : isVotableElem().prop("checked"),
        inLive        : inLiveElem().prop("checked"),
        isShared      : isSharedElem().prop("checked"),
        isAnonymous   : isAnonymousElem().prop("checked"),
    }

    store.set(draftName(), draft)

    titleElem().val("")
    contentElem().val("")
    imagesElem().val("")
    tagsElem().val("")
}

function togglePublicOnly() {
    let privacy = privacyElem().val()
    let mePrivacy = $("body").data("mePrivacy")

    let commenting = $("#allow-commenting")
    let voting = $("#allow-voting")
    if(privacy === "me") {
        commenting.hide()
        voting.hide()
    } else {
        commenting.show()
        voting.show()
    }

    let shared = $("#shared")
    if(privacy === "all" && mePrivacy === "all") {
        shared.hide()
    } else {
        shared.show()
    }

    let live = $("#allow-live")
    if(privacy === "me" || privacy === "followers") {
        live.hide()
    } else {
        live.show()
    }
}

function togglePrivacyHint() {
    let entryPrivacy = privacyElem().val()
    let mePrivacy = $("body").data("mePrivacy")

    let show = false
    if(mePrivacy === "registered")
        show = (entryPrivacy === "all")
    else if(mePrivacy === "invited")
        show = (entryPrivacy === "all" || entryPrivacy === "registered")
    else
        show = (entryPrivacy === "all" || entryPrivacy === "registered" || entryPrivacy === "invited")

    privacyElem().parents(".form-group").find(".hint").toggle(show)
}

function toggleLiveHint() {
    let entryPrivacy = privacyElem().val()
    let mePrivacy = $("body").data("mePrivacy")
    let inLive = inLiveElem().prop("checked")

    let show = inLive && (mePrivacy === "followers") && (entryPrivacy !== "me" && entryPrivacy !== "followers")
    $("#allow-live").next(".hint").toggle(show)
}

function init() {
    privacyElem().change(togglePublicOnly)
    privacyElem().change(togglePrivacyHint)
    privacyElem().change(toggleLiveHint)
    inLiveElem().change(toggleLiveHint)

    if(isCreating())
    {
        loadDraft()
        setInterval(storeDraft, 60000)
        $(window).on("pagehide", storeDraft)
    }

    togglePublicOnly()
    toggleLiveHint()
    togglePrivacyHint()
    initTags()
}

init()

function loadImages(){
    let inp = $("#input-images")
    let ids = inp.val().split(",")

    for(let i = 0; i < ids.length; i++) {
        let id = ids[i]
        if(!id)
            continue

        $.ajax({
            method: "GET",
            url: "/images/" + id,
            dataType: "html",
            success: function(data) {
                let img = $(data)
                $("#attached-images").append(img)
                CRUMINA.mediaPopups(img)
            },
            error: function(req) {
                if(req.status === 404)
                    removeImageID(id)
                else
                    showAjaxError(req)
            },
        })
    }
}

$("#post-entry").click(function() { 
    let btn = $(this)
    if(btn.hasClass("disabled"))
        return false;

    let form = $("#entry-editor")
    if(!form[0].reportValidity())
        return false

    btn.addClass("disabled")

    form.ajaxSubmit({
        dataType: "json",
        success: function(data) {
            if(isCreating()) {
                removeDraft()
                $(window).off("pagehide")
            }
                
            window.location.pathname = data.path
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
        },
    })

    return false;
})

$("#show-draft").click(function() {
    let btn = $(this)
    let postBtn = $("#post-entry")
    if(btn.hasClass("disabled") || postBtn.hasClass("disabled"))
        return false

    let form = $("#entry-editor")
    if(!form[0].reportValidity())
        return false

    let modal = $("#post-popup")
    if(!modal.length)
        return

    modal.data("loading", true)
    modal.modal("show")
    $("#show-draft>svg").tooltip("hide")

    btn.addClass("disabled")
    postBtn.addClass("disabled")
    isDraftElem().val("true")

    let action = form.prop("action")
    if(!isCreating())
        form.prop("action", "/entries")

    form.ajaxSubmit({
        dataType: "HTML",
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(entry) {
            window.location.hash = "post-popup"
            let body = modal.find(".modal-body")
            body.replaceWith(entry)
            formatTimeElements(modal)
            window.embedder.addEmbeds(modal)
            modal.find(".gif-play-image").gifplayer()
            modal.each(function(){ CRUMINA.mediaPopups(this) })
            fixSvgUse(modal)
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
            postBtn.removeClass("disabled")
            isDraftElem().val("false")
            modal.removeData("loading")
            if(!isCreating())
                form.prop("action", action)
        },
    })

    return false
})

$("#show-upload-image").click(function(){
    let cnt = $("#attached-images").children().length
    if(cnt < 10)
    {
        $("#upload-image-popup").modal("show")
        return false
    }

    alert("К посту можно прикрепить не более десяти изображений.")
    return false
})

function appendImage(data) {
    let img = $(data)
    $("#attached-images").append(img)

    let id = img.data("imageId")
    let inp = $("#input-images")
    let ids = inp.val()
    if(ids)
        ids += "," + id
    else
        ids = id
    inp.val(ids)

    updImageIDs.push(id)
    if(updImageIDs.length === 1)
        updateNextImage()

    return id
}

$(".upload-image").click(function() { 
    let btn = $(this)
    if(btn.hasClass("disabled"))
        return false

    let form = btn.parent()
    if(!form[0].reportValidity())
        return false

    if(!checkFileSize(form))
        return false

    btn.addClass("disabled")

    let sk = btn.parents(".modal-body").find(".skills-item")
    sk.attr("hidden", false)
    let bar = sk.find(".skills-item-meter-active")
    let units = sk.find(".units")

    form.ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
        uploadProgress: function(e, pos, total, percent) {
            bar.width(percent + "%")
            units.text(Math.round(pos / 1024) + " из " + Math.round(total / 1024) + " Кб")
        },
        success: function(data) {
            appendImage(data)
                        
            btn.parents(".modal").modal("hide")
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
            form.find(".control-label").text("")
            bar.width(0)
            units.text("")
            sk.attr("hidden", true)
        },
    })

    return false
})

let updImageIDs = []
let insImageID = 0

function updateNextImage(timeout = 1000) {
    if(!updImageIDs.length)
        return

    let id = updImageIDs[0]
    let img = $("#attached-image" + id)
    if(!img.data("processing")) {
        if(insImageID === id) {
            $("#paste-image-popup").modal("hide")
            insertImage(id)
        }

        CRUMINA.mediaPopups(img)

        updImageIDs.shift()
        updateNextImage()
        return
    }

    if(timeout > 60000)
        timeout = 60000

    function getImage() {
        if(updImageIDs.indexOf(id) < 0)
            return updateNextImage(timeout * 2)

        $.ajax({
            method: "GET",
            url: "/images/" + id,
            success: function(html) {
                img.replaceWith(html)
                updateNextImage(timeout * 2)
            },
            error: showAjaxError,
        })
    }

    setTimeout(getImage, timeout)
}

function removeImageID(id) {
    let i = updImageIDs.indexOf(id)
    if(i >= 0)
        updImageIDs.splice(i, 1)

    let inp = $("#input-images")
    let ids = inp.val().split(",")
    i = ids.indexOf(id + "")
    if(i >= 0)
        ids.splice(i, 1)
    inp.val(ids.join(","))
}

function insertImage(id) {
    let img = $("#attached-image" + id)
    let params = new URLSearchParams()
    if(img.data("isAnimated")) {
        params.set("mp", img.data("mediumPreview"))
        params.set("mu", img.data("mediumUrl"))
        params.set("mh", img.data("mh"))
        params.set("mw", img.data("mw"))
    } else {
        params.set("su", img.data("smallUrl"))
        params.set("mu", img.data("mediumUrl"))
        params.set("lu", img.data("largeUrl"))
        params.set("mh", img.data("mh"))
        params.set("mw", img.data("mw"))
        params.set("sh", img.data("sh"))
        params.set("sw", img.data("sw"))
    }
    let src = img.data("largeUrl")
    src += "?" + params.toString()

    let idx = $("#input-images").val().split(",").indexOf(id+"") + 1
    let title = "изображение " + idx
    let md = "\n\n![" + title + "](" + src + ")\n\n"

    let area = contentElem()[0]
    let selStart = area.selectionStart
    while(selStart > 0 && area.value[selStart-1] === "\n")
        selStart--
    selStart = area.value.indexOf("\n", selStart)
    if(selStart < 0)
        selStart = area.value.length
    let selEnd = selStart
    while(selEnd < area.value.length && area.value[selEnd] === "\n") {
        selEnd++
    }
    area.selectionStart = selStart
    area.selectionEnd = selEnd

    area.setRangeText(md)
    area.selectionStart = selStart + 4
    area.selectionEnd = area.selectionStart + title.length

    area.scrollIntoView()
    area.focus()

    return false
}

function removeImage(id) {
    if(!confirm("Удалить изображение?"))
        return false

    let img = $("#attached-image" + id)
    let src = img.data("largeUrl")
    let pattern = "\\n*!\\[[^\\]]*\\]\\(" + src + "[^)]*\\)\\n*"
    let re = new RegExp(pattern, "gi")
    let oldText = contentElem().val()
    let newText = oldText.replace(re, "\n\n")
    if (oldText !== newText) {
        contentElem().val(newText)
    }

    img.remove()

    removeImageID(id)

    if(!isCreating())
        return false

    $.ajax({
        method: "DELETE",
        url: "/images/" + id,
        error: showAjaxError,
    })

    return false
}

contentElem().on("paste", function (event) {
    let items = event.originalEvent.clipboardData.items
    let file
    for (let i = 0 ; i < items.length ; i++) {
        let item = items[i]
        if (item.type.indexOf("image") !== -1) {

            file = item.getAsFile()
            break
        }
    }
    if (!file)
        return

    let maxSize = $("#upload-image-popup input[type=file][data-max-size]").data("maxSize")
    if(file.size / 1024 / 1024 > parseInt(maxSize, 10)) {
        alert("Можно загружать файлы размером не более " + maxSize + " Мб.")
        return false
    }

    const formData = new FormData()
    formData.set("file", file)

    let modal = $("#paste-image-popup")
    let sk = modal.find(".skills-item")
    let bar = sk.find(".skills-item-meter-active")
    let units = sk.find(".units")
    let state = $("#paste-image-state")
    state.text("Отправка…")
    bar.width(0)
    units.text("")
    modal.modal("show")

    $.ajax({
        method: "POST",
        url: "/images",
        data: formData,
        contentType: false,
        processData: false,
        headers: {
            "X-Error-Type": "JSON",
        },
        xhr: function(){
            let xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', function(e){
                if(!e.lengthComputable)
                    return

                bar.width(e.loaded / e.total * 100 + "%")
                units.text(Math.round(e.loaded / 1024) + " из " + Math.round(e.total / 1024) + " Кб")
            }, false);

            return xhr;
        },
        success: function(data) {
            insImageID = appendImage(data)
            state.text("Обработка…")
        },
        error: function(req) {
            modal.modal("hide")
            showAjaxError(req)
        },
    })

    return false
})

function initTags() {
    const loadUrl = tagsElem().data("action")

    tagsElem().selectize({
        create: true,
        createOnBlur: true,
        createFilter: (value) => value.length <= 50,
        maxItems: 5,
        hideSelected: true,
        addPrecedence: true,
        selectOnTab: true,
        preload: "focus",
        valueField: "tag",
        labelField: "tag",
        sortField: [
            {
                field: "count",
                direction: "desc"
            }
        ],
        searchField: "tag",
        load: function (query, callback) {
            if(query) {
                callback()
                return
            }

            $.ajax({
                method: "GET",
                url: loadUrl + "?limit=100",
                dataType: "json",
                success: function (resp) {
                    if(resp.data) {
                        callback(resp.data)
                        return
                    }

                    $.ajax({
                        method: "GET",
                        url: "/entries/tags?limit=100",
                        dataType: "json",
                        success: function (resp) {
                            callback(resp.data)
                        },
                        error: showAjaxError,
                    })
                },
                error: showAjaxError,
            })
        },
        render: {
            option: function (data, escape) {
                return "<span>" + escape(data.tag) + (data.count ? " <b>(" + data.count + ")</b>" : "") + "</span>"
            },
            option_create: function (data, escape) {
                return "<span class='create'>" + escape(data.input) + " <b>(новый)</b></span>"
            },
            item: function (data, escape) {
                return "<span>" + escape(data.tag) + "</span>"
            }
        }
    })
}
