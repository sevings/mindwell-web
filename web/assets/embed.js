class Embed {
    constructor(id, onPlay) {
        this.id = id

        this.onPlay = () => {
            onPlay(this.id)
        }
    }
    play() {}
    pause() {}
}

class EmbedProvider {
    name() {}
    embed(id, onPlay) {}
}

class Embedder {
    constructor() {
        this.providers = new Map()
        this.embeds = new Map()
        this.nextIDs = []
        this.next = 1

        this.onPlay = this.onPlay.bind(this)
    }
    addProvider(prov) {
        this.providers.set(prov.name(), prov)

        this.addEmbeds(document, prov.name())
    }
    addEmbeds(element, type) {
        let query = ".embed"
        if(type)
            query += "[data-type='" + type + "']"

        $(element).find(query).each((i, e) => {
            if(!e.id)
                e.id = "embed-" + this.next++

            this.nextIDs.push(e.id)
        })

        setTimeout(() => { this.createEmbeds() }, 0)
    }
    embed(id) {
        let e = this.embeds.get(id)
        if(e)
            return e

        return new Embed("", () => {})
    }
    createEmbeds() {
        this.nextIDs.forEach(id => {
            if(this.embeds.has(id))
                return

            let name = $("#" + id).data("provider")
            let prov = this.providers.get(name)
            if(!prov)
                return

            let embed = prov.embed(id, this.onPlay)
            this.embeds.set(id, embed)
        })

        this.nextIDs = []
    }
    onPlay(playingID) {
        let removed = []

        this.embeds.forEach((embed, id) => {
            if(!document.getElementById(id))
                removed.push(id)
            else if(id !== playingID)
                embed.pause()
        })

        removed.forEach(id => {
            this.embeds.delete(id)
        })
    }
}

window.embedder = new Embedder()

class YouTubeEmbed extends Embed {
    constructor(id, onPlay) {
        super(id, onPlay)

        this.onStateChange = this.onStateChange.bind(this)

        this.player = new YT.Player(id, {
            events: {
                "onStateChange": this.onStateChange
            }
        })
    }
    play() {
        if(this.isPlaying() === false)
            this.player.playVideo()
    }
    pause() {
        if(this.isPlaying())
            this.player.pauseVideo()
    }
    isPlaying() {
        if(typeof this.player.getPlayerState !== "function")
            return

        return this.player.getPlayerState() === YT.PlayerState.PLAYING
    }
    onStateChange(event) {
        if(event.data === YT.PlayerState.PLAYING)
            this.onPlay()
    }
}

class YouTubeProvider extends EmbedProvider {
    name() {
        return "YouTube"
    }
    embed(id, onPlay) {
        return new YouTubeEmbed(id, onPlay)
    }
}

function onYouTubeIframeAPIReady() {
    window.embedder.addProvider(new YouTubeProvider())
}

class SoundCloudEmbed extends Embed {
    constructor(id, onPlay) {
        super(id, onPlay)

        this.player = SC.Widget(id)
        this.player.bind(SC.Widget.Events.PLAY, this.onPlay)
    }
    play() {
        this.player.play()
    }
    pause() {
        this.player.pause()
    }
}

class SoundCloudProvider extends EmbedProvider {
    name() {
        return "SoundCloud"
    }
    embed(id, onPlay) {
        return new SoundCloudEmbed(id, onPlay)
    }
}

$(() => { window.embedder.addProvider(new SoundCloudProvider()) })

class CoubEmbed extends Embed {
    constructor(id, onPlay) {
        super(id, onPlay)

        let coub = document.getElementById(id).contentWindow
        coub.addEventListener("message", (e) => {
            if (e.data === 'playStarted')
                this.onPlay()
        })
    }
    post(cmd) {
        let coub = document.getElementById(this.id)
        if(!coub)
            return

        coub.contentWindow.postMessage(cmd, "*")
    }
    play() {
        this.post("play")
    }
    pause() {
        this.post("stop")
    }
}

class CoubProvider extends EmbedProvider {
    name() {
        return "Coub"
    }
    embed(id, onPlay) {
        return new CoubEmbed(id, onPlay)
    }
}

$(() => { window.embedder.addProvider(new CoubProvider()) })

class VimeoEmbed extends Embed {
    constructor(id, onPlay) {
        super(id, onPlay)

        let iframe = document.getElementById(id)
        this.player = new Vimeo.Player(iframe)

        this.player.on("play", this.onPlay)
    }
    play() {
        this.player.play()
    }
    pause() {
        this.player.pause()
    }
}

class VimeoProvider extends EmbedProvider {
    name() {
        return "Vimeo"
    }
    embed(id, onPlay) {
        return new VimeoEmbed(id, onPlay)
    }
}

$(() => { window.embedder.addProvider(new VimeoProvider()) })
