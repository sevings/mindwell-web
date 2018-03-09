$(function() {
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
