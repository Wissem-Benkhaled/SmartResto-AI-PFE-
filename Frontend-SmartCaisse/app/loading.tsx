// app/loading.tsx
export default function Loading() {
    return (
        <div className="h-screen flex bg-gray-100 animate-pulse">
            {/* Simulation de la liste de produits */}
            <div className="flex-1 p-10 grid grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-40 bg-gray-200 rounded-2xl"></div>
                ))}
            </div>

            {/* Simulation du panier à droite */}
            <div className="w-1/3 bg-white p-6 border-l border-gray-200">
                <div className="h-8 bg-gray-200 w-1/2 mb-8 rounded"></div>
                <div className="space-y-4">
                    <div className="h-4 bg-gray-100 w-full rounded"></div>
                    <div className="h-4 bg-gray-100 w-3/4 rounded"></div>
                </div>
                <div className="mt-auto pt-20">
                    <div className="h-12 bg-gray-200 w-full rounded-xl"></div>
                </div>
            </div>
        </div>  
    );
}