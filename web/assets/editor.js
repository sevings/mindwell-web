/*$(function() {
    var editor = editormd({
        id:              "editormd",
        path:            "/assets/editor/lib/",
        height:          640,
        placeholder:     "Текст поста",
        watch:           false,
        mode:            "markdown",
        name:            "content",
        lineNumbers:     false,
        indentWithTabs:  false,
        styleActiveLine: false,
        toc:             false,
        fontSize:        "14px",
        toolbarIcons :   function() {
            return [
                "undo", "redo", "|", 
                "bold", "del", "italic", "quote", "|", 
                "h3", "h4", "h5", "h6", "|", 
                "list-ul", "list-ol", "hr", "link", "image", "||",
                "watch", "fullscreen", "|",
                "help", "info"
            ]
        },
    });
});
*/

store = new window.Basil();

function titleElem()        { return $("input[name='title']") }
function contentElem()      { return $("textarea[name='content']") }
function privacyElem()      { return $("select[name='privacy']") }
function isVotableElem()    { return $("input[name='isVotable']") }
function inLiveElem()       { return $("input[name='inLive']") }

function entryId()          { return parseInt($("#entry-editor").data("entryId")) }
function isCreating()       { return entryId() <= 0 }

function storeDraft() {
    var draft = {
        title       : titleElem().val(),
        content     : contentElem().val(),
        privacy     : privacyElem().val(),
        isVotable   : isVotableElem().prop("checked"),
        inLive      : inLiveElem().prop("checked"),
    }

    store.set("draft", draft)
}

function loadDraft() {
    var draft = store.get("draft")
    if(!draft)
        return

    if(draft.title)
        titleElem().val(draft.title)

    if(draft.content)
        contentElem().val(draft.content)

    privacyElem().val(draft.privacy)
    $('.selectpicker').selectpicker('refresh');
    togglePublicOnly()

    isVotableElem().prop("checked", draft.isVotable)
    inLiveElem().prop("checked", draft.inLive)
}

function removeDraft() {
    var draft = {
        privacy     : privacyElem().val(),
        isVotable   : isVotableElem().prop("checked"),
        inLive      : inLiveElem().prop("checked"),
    }

    store.set("draft", draft)   
}

function togglePublicOnly() {
    var elems= $(".for-public-only")
    var privacy = privacyElem().val()
    if(privacy == "me") {
        elems.hide()
    } else {
        elems.show()
    }    
}

privacyElem().change(togglePublicOnly)

$(function(){
    togglePublicOnly()
    if(!isCreating())
        return

    loadDraft()
    setInterval(storeDraft, 60000)
    $(window).on("pagehide", storeDraft)
})

$("#post-entry").click(function() { 
    $("#entry-editor").ajaxSubmit({
        dataType: "json",
        success: function(data) {
            if(isCreating()) {
                removeDraft()
                $(window).off("pagehide")
            }
                
            window.location.pathname = data.path
        },
        error: showAjaxError,
    })

    return false;
})
