store = new window.Basil();

function titleElem()        { return $("input[name='title']") }
function contentElem()      { return $("textarea[name='content']") }
function privacyElem()      { return $("select[name='privacy']") }
function isVotableElem()    { return $("input[name='isVotable']") }
function inLiveElem()       { return $("input[name='inLive']") }
function imagesElem()       { return $("input[name='images']") }
function tagsElem()         { return $("input[name='tags']") }

function entryId()          { return parseInt($("#entry-editor").data("entryId")) }
function isCreating()       { return entryId() <= 0 }

function storeDraft() {
    let draft = {
        title       : titleElem().val(),
        content     : contentElem().val(),
        tags        : tagsElem().val(),
        privacy     : privacyElem().val(),
        images      : imagesElem().val(),
        isVotable   : isVotableElem().prop("checked"),
        inLive      : inLiveElem().prop("checked"),
    }

    store.set("draft", draft)
}

function loadDraft() {
    let draft = store.get("draft")
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
    togglePublicOnly()

    isVotableElem().prop("checked", draft.isVotable)
    inLiveElem().prop("checked", draft.inLive)
}

function removeDraft() {
    let draft = {
        privacy     : privacyElem().val(),
        isVotable   : isVotableElem().prop("checked"),
        inLive      : inLiveElem().prop("checked"),
    }

    store.set("draft", draft)   
}

function togglePublicOnly() {
    let elems= $(".for-public-only")
    let privacy = privacyElem().val()
    if(privacy == "me") {
        elems.hide()
    } else {
        elems.show()
    }    
}

function init(){
    privacyElem().change(togglePublicOnly)

    togglePublicOnly()
    if(!isCreating())
        return;

    loadDraft()
    setInterval(storeDraft, 60000)
    $(window).on("pagehide", storeDraft)
}

init()

function loadImages(){
    var inp = $("#input-images")
    var ids = inp.val().split(",")

    for(var i = 0; i < ids.length; i++) {
        var id = ids[i]
        if(!id)
            continue

        $.ajax({
            method: "GET",
            url: "/images/" + id,
            dataType: "html",
            success: function(data) {
                var img = $(data)
                $("#attached-images").append(img)
            },
            error: showAjaxError,
        })
    }
}

$("#post-entry").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;

    var form = $("#entry-editor")
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
    var cnt = $("#attached-images").children().length
    if(cnt < 5)
    {
        $("#upload-image-popup").modal("show")
        return false
    }

    alert("К посту можно прикрепить не более пяти изображений.")
    return false
})

$(".upload-image").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false

    var form = btn.parent()
    if(!form[0].reportValidity())
        return false

    if(!checkFileSize(form))
        return false

    btn.addClass("disabled")

    var sk = btn.parents(".modal-body").find(".skills-item")
    sk.attr("hidden", false)
    var bar = sk.find(".skills-item-meter-active")
    var units = sk.find(".units")

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
            var img = $(data)
            $("#attached-images").append(img)

            var id = img.data("imageId")
            var inp = $("#input-images")
            var ids = inp.val()
            if(ids)
                ids += "," + id
            else
                ids = id
            inp.val(ids)

            updImageIDs.push(id)
            if(updImageIDs.length == 1)
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

var updImageIDs = []

function updateNextImage(timeout = 1000) {
    if(!updImageIDs.length)
        return

    var id = updImageIDs[0]
    var img = $("#attached-image" + id)
    if(!img.data("processing")) {
        updImageIDs.shift()
        updateNextImage()
        return
    }

    if(timeout > 60000)
        timeout = 60000

    function getImage() {
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

function removeImage(id) {
    if(!confirm("Удалить изображение?"))
        return false

    $("#attached-image"+id).remove()

    var i = updImageIDs.indexOf(id)
    if(i >= 0)
        updImageIDs.splice(i, 1)

    var inp = $("#input-images")
    var ids = inp.val().split(",")
    i = ids.indexOf(id + "")
    if(i >= 0)
        ids.splice(i, 1)
    inp.val(ids.join(","))

    if(!isCreating())
        return false

    $.ajax({
        method: "DELETE",
        url: "/images/" + id,
        error: showAjaxError,
    })

    return false
}
