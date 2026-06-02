interface VirtualKeyboardProps {
    visible: boolean;
    onKey: (key: string) => void;
    onDelete: () => void;
    onConfirm: () => void;
}

const VirtualKeyboard = ({ visible, onKey, onDelete, onConfirm }: VirtualKeyboardProps) => {
    const row1 = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const row2 = ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"];
    const row3 = ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"];
    const row4 = ["W", "X", "C", "V", "B", "N", "@", ".", "-"];

    const keyClass =
        "h-10 bg-gray-600 rounded-lg bg-muted/80 text-foreground font-semibold text-sm hover:bg-muted active:scale-95 transition-all border border-border/40 flex items-center justify-center select-none";

    if (!visible) return null;

    return (
        <div className="fixed bottom-3  left-0 right-132 z-50 bg-card/95 bg-gray-50 border border-border/400 rounded-lg shadow-[0_-8px_30px_rgba(10,10,10,0.52)] px-5 py-5">
            <button onClick={onConfirm}>
                <span className="cursor-pointer absolute top-2 right-6 rounded-full  text-gray-600 flex items-center justify-center text-[30px] font-bold">
                X
              </span>
            </button>
            <div >
                <div className="max-w-[850px]  mx-auto space-y-1.5">
                    <div className=" grid grid-cols-10 gap-1.5">
                        {row1.map((k) => (
                            <button key={k} onClick={() => onKey(k)} className={keyClass}>{k}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-10 gap-1.5">
                        {row2.map((k) => (
                            <button key={k} onClick={() => onKey(k.toLowerCase())} className={keyClass}>{k}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-10 gap-1.5">
                        {row3.map((k) => (
                            <button key={k} onClick={() => onKey(k.toLowerCase())} className={keyClass}>{k}</button>
                        ))}
                    </div>
                    <div className="flex gap-1.5">
                        {row4.map((k) => (
                            <button key={k} onClick={() => onKey(k.toLowerCase())} className={`${keyClass} flex-1`}>{k}</button>
                        ))}
                        <button onClick={onDelete} className="flex-1 h-10 rounded-lg text-black font-semibold active:scale-95 transition-all border   ">
                            ⌫
                        </button>
                    </div>
                    <div className="flex gap-1.5">
                        <button onClick={() => onKey(" ")} className="flex-1 h-10 rounded-lg text-black font-semibold text-muted-foreground font-medium  active:scale-95 transition-all border">
                            Espace
                        </button>
                        <button onClick={onConfirm} className="w-24 h-10 rounded-lg bg-success text-black font-semibold active:scale-95 transition-all border  ">
                            ✓ OK
                        </button>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default VirtualKeyboard;
