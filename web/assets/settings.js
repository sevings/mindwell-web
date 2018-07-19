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

$("#save-email-settings").click(function() { 
    var status = $("#email-settings-status")
    
    $("#email-settings").ajaxSubmit({
        resetForm: false,
        success: function() {
            status.text("Настройки сохранены.")
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

$("#verify-email a").click(function() { 
    var p = $("#verify-email")
    $.ajax({
        url: "/account/verification",
        method: "POST",
        success: function() {
            p.text("Письмо с кодом подтверждения отправлено на почту.")
            p.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            p.text("При выполнении запроса произошла ошибка: " + resp.message)
        },
    })

    return false
})
