const inputBusqueda = document.getElementById("busqueda")

let marcaActual = "";


inputBusqueda.addEventListener("input" , function(event) {

    const textoBusqueda = event.target.value.toLowerCase();

    const resultados = window.productosDB.filter(producto =>
        producto.nombre.toLowerCase().includes(textoBusqueda)
    );

    console.log(resultados)
});