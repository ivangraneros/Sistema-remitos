const inputBusqueda = document.getElementById("busqueda")

let marcaActual = "";

inputBusqueda.addEventListener("input", function(event) {
    const textoBusqueda = event.target.value.toLowerCase();

    const resultados = window.productosDB.filter(producto => {
        
        const nombreProducto = String(producto.nombre || "").toLowerCase();
        return nombreProducto.includes(textoBusqueda);
    });

    console.log(resultados);
});