$("#send-message").click(sendMessage)
$("#message-form textarea").on("keydown", onMessageFormKeyDown)

function onMessageFormKeyDown(e){
    if(e.key != "Enter")
        return

    if(e.shiftKey)
        return

    if(window.isTouchScreen)
        return

    return sendMessage()
}

function sendMessage(){
    let uid = $("#message-uid")
    if(!uid.val())
        uid.val(Date.now())

    let form = $("#message-form")
    if(!form[0].reportValidity())
        return false

    form.ajaxSubmit({
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(data) {
            uid.val("")

            let msg = $(formatTimeHtml(data))
            CRUMINA.mediaPopups(msg)

            let ul = $("#chat-wrapper ul")
            let id = msg.data("id")
            let prev = ul.find("#message" + id)
            if(prev.length)
                prev.replaceWith(msg)
            else
                ul.append(msg)

            fixSvgUse(msg)
        },
        error: showAjaxError,
        clearForm: true,
    })

    return false
}
