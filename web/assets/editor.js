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

function titleElem()        { return $("textarea[name='title']") }
function contentElem()      { return $("textarea[name='content']") }
function privacyElem()      { return $("select[name='privacy']") }
function isVotableElem()    { return $("input[name='isVotable']") }

function storeDraft() {
    var draft = {
        title       = titleElem().val(),
        content     = contentElem().val(),
        privacy     = privacyElem().val(),
        isVotable   = isVotableElem().prop("checked"),
    }

    store.set("draft", draft)
}

function loadDraft() {
    var draft = store.get("draft")
    if(!draft)
        return

    titleElem().val(draft.title)
    contentElem().val(draft.content)
    privacyElem().val(draft.privacy)
    isVotableElem().prop("checked", draft.isVotable)
}

function removeDraft() {
    var draft = {
        title       = "",
        content     = "",
        privacy     = privacyElem().val(),
        isVotable   = isVotableElem().prop("checked"),
    }

    store.set("draft", draft)   
}

$(function(){
    var entryId = $("#entry-editor").data("entryId")
    if(entryId > 0)
        return

    loadDraft()
    setInterval(storeDraft, 60000)
})

$(window).on("beforeunload", storeDraft)

$("#post-entry").click(function() { 
    $("#entry-editor").ajaxSubmit({
        dataType: "json",
        success: function(data) {
            removeDraft()
            $(window).off("beforeunload")
            window.location.pathname = data.path
        },
        error: function(data) {
            alert(data)
        },
    })

    return false;
})
