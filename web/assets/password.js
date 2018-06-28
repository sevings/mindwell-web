$("#save-password").click(function() { 
    var status = $("#password-status")
    
    $("#change-password").ajaxSubmit({
        resetForm: true,
        success: function() {
           status.text("Пароль изменен.")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            status.text(resp.message)
        },
    })

    return false;
})
