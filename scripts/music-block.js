const siloLaunchEffect = newEffect(20, e => {
    Draw.color(Color.white, Color.lightGray, e.fin()); //color goes from white to light gray
    Lines.stroke(e.fout() * 3); //line thickness goes from 3 to 0
    Lines.circle(e.x, e.y, e.fin() * 100); //draw a circle whose radius goes from 0 to 100
});

const silo = extendContent(Block, "music-block", {
    buildConfiguration(tile, table){
        table.addImageButton(Icon.arrowUpSmall, Styles.clearTransi, run(() => {
            tile.configure(0)
        })).size(50).disabled(boolf(b => !tile.entity.cons.valid()))
    },

    configured(tile, value){
        if(tile.entity.cons.valid()){
            Effects.effect(siloLaunchEffect, tile)

            
            for(var i = 0; i < 150; i++){
                Calls.createBullet(Bullets.flakExplosive, tile.getTeam(), tile.drawx(), tile.drawy(), Mathf.random(360), Mathf.random(0.5, 1.0), Mathf.random(0.2, 1.0))
            }
            
            tile.entity.cons.trigger()
        }
    }
})

