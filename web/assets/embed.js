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
    type() {}
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
        this.providers.set(prov.type(), prov)

        this.addEmbeds(document, prov.type())
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

            let type = $("#" + id).data("type")
            let prov = this.providers.get(type)
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
    type() {
        return "youtube"
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
    type() {
        return "soundcloud"
    }
    embed(id, onPlay) {
        return new SoundCloudEmbed(id, onPlay)
    }
}

$(() => { window.embedder.addProvider(new SoundCloudProvider()) })
