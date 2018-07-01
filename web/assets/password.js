$("#save-password").click(function() { 
    var status = $("#password-status")
    
    $("#change-password").ajaxSubmit({
        resetForm: true,
        success: function() {
            status.text("Пароль изменен.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
            status.addClass("alert-danger").removeClass("alert-success")
        },
        complete: function() {
            status.toggleClass("alert", true)
        },
    })

    return false;
})
