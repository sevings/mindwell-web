store = new window.Basil();

function titleElem()         { return $("input[name='title']") }
function contentElem()       { return $("textarea[name='content']") }
function privacyElem()       { return $("select[name='privacy']") }
function isCommentableElem() { return $("input[type='checkbox'][name='isCommentable']") }
function isVotableElem()     { return $("input[name='isVotable']") }
function isAnonymousElem()   { return $("input[name='isAnonymous']") }
function inLiveElem()        { return $("input[name='inLive']") }
function isSharedElem()      { return $("input[name='isShared']") }
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

    let commenting = $("#allow-commenting")
    let voting = $("#allow-voting")
    if(privacy === "me") {
        commenting.hide()
        voting.hide()
    } else {
        commenting.show()
        voting.show()
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

function updateNextImage(timeout = 1000) {
    if(!updImageIDs.length)
        return

    let id = updImageIDs[0]
    let img = $("#attached-image" + id)
    if(!img.data("processing")) {
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

function removeImage(id) {
    if(!confirm("Удалить изображение?"))
        return false

    $("#attached-image"+id).remove()

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
