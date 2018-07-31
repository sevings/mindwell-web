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

function storeEntry() {
    var entry = {
        title       = $("textarea[name='title']").val(),
        content     = $("textarea[name='content']").val(),
        privacy     = $("select[name='privacy']").val(),
        isVotable   = $("input[name='isVotable']").prop("checked"),
    }

    store.set("entry", entry)
}

function loadEntry() {
    var entry = store.get("entry")

    $("textarea[name='title']").val(entry.title)
    $("textarea[name='content']").val(entry.content)
    $("select[name='privacy']").val(entry.privacy)
    $("input[name='isVotable']").prop("checked", entry.isVotable)
}

$(function(){
    var entryId = $("#entrty-editor").data("entryId")
    if(entryId > 0)
        return

    loadEntry()
    setInterval(storeEntry, 30000)
})

$(window).on("beforeunload", storeEntry)

$("#post-entry").click(function() { 
    $("#entry-editor").ajaxSubmit({
        dataType: "json",
        success: function(data) {
            store.remove("entry")
            $(window).off("beforeunload")
            window.location.pathname = data.path
        },
        error: function(data) {
            alert(data)
        },
    })

    return false;
})
