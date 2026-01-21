class NetSimGUI{
    grid: HTMLElement
    editorState: object
    packetModalState: object
    gridSideLenght:number

    /**
     * 
     * @param grid uninitialized grid
     * @param editorState base state of the editor
     * @param packetModalState base state of the packetModal
     * @param sideLenght the lenght of on side of the grid
     */
    constructor(grid : HTMLElement, editorState : Object, packetModalState: object, sideLenght: number){
        this.grid = grid;
        this.editorState = editorState
        this.packetModalState = packetModalState
        this.gridSideLenght = sideLenght;
    }

    

}


