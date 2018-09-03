$("#live-section").change(function() {
    var section = $(this).val()
    window.location.search = "section=" + section
})

$("#friends-section").change(function() {
    var section = $(this).val()
    if(section == "friends") 
        window.location.pathname = "/friends"
    else if(section == "watching")
        window.location.pathname = "/watching"
    else
        console.log("unknown section: " + section)
})
