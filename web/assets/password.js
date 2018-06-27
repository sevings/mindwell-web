$("#old-password, .new-password").keyup(function() {
    var match = newPasswordsMatch();
    var filled = formFilled();

    $("#password-status").text(match ? "" : "Пароли не совпадают.")
    $("#save-password").toggleClass("disabled", !match || !filled)
})

function newPasswordsMatch() {
    var inputs = $(".new-password")
    return inputs[0].attr("value") == inputs[1].attr("value")    
}

function formFilled() {
    var inputs = $("#old-password, .new-password")
    for(var i = 0; i < inputs.length; i++)
        if(inputs[i].attr("value").length == 0)
            return false;

    return true;
}

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
