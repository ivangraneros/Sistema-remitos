// import "./cargador.js";
import { db } from "../config/firebase-config.js";
import { collection, addDoc, getDocs } from "firebase/firestore";


window.productosDB = []; 
window.pedidoActual = {};

async function cargarProductos() {
    try {
        const querySnapshot = await getDocs(collection(db, "catalogo"));
        window.productosDB = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("✅ Stock en memoria:", window.productosDB.length);

        
        activarBotones();

    } catch (error) {
        console.error("Error al cargar:", error);
    }
}


function activarBotones() {
    const btn = document.getElementById('btn-marcas');
    const txt = document.getElementById('btn-text');
    ;

    if (btn) {
        btn.disabled = false;
        if (txt) txt.innerText = "cargar productos";
    } else {
        
        console.warn("Buscando botón...");
        setTimeout(activarBotones, 300);
    }
}

window.mostrarProductos = function(seccion) {

    window.seccionActual = seccion;
    
    const buscador = document.getElementById('input-buscador');
    if (buscador) buscador.value = ""; 

    
    const iniciales = window.productosDB.filter(p => 
        p.seccion && p.seccion.toLowerCase() === seccion.toLowerCase()
    );
    
    renderizarLista(iniciales);
}

function renderizarLista(lista) {
    const div = document.getElementById('lista-productos');
    let html = "";
    
    lista.forEach(p => {
        html += `
            <div class="producto-row">
                <div class="producto-info">
                    <span class="producto-nombre">${p.nombre}</span>
                    <span class="producto-precio">$${p.precio}</span>
                </div>
                <input type="number" min="0" placeholder="0" 
                    onchange="actualizarPedido('${p.nombre}', ${p.precio}, this.value)">
            </div>
        `;
    });
    div.innerHTML = html;
}

window.ejecutarBusqueda = function() {
    if (!window.seccionActual) return;

    const buscador = document.getElementById('input-buscador');
    const fraseBuscador = buscador.value.toLowerCase().trim();

    const palabras = fraseBuscador.split("");

    const resultados = window.productosDB.filter(p => {
        const coincideSeccion = p.seccion && p.seccion.toLowerCase() === window.seccionActual.toLowerCase();

        const nombreProducto = p.nombre.toLowerCase();
        const coincideNombre = palabras.every(palabra => nombreProducto.includes(palabra));
        return coincideSeccion && coincideNombre;
    });

    
    renderizarLista(resultados);
}

window.actualizarPedido = function(nombre, precio, cantidad) {
    const cant = parseInt(cantidad);
    if (cant > 0) {
        window.pedidoActual[nombre] = { precio, cantidad: cant };
    } else {
        delete window.pedidoActual[nombre];
    }
    dibujarResumen();
}

function dibujarResumen() {
    const res = document.getElementById('resumen-pedido');
    const totalTxt = document.getElementById('total-final');
    if (!res || !totalTxt) return;

    let html = "";
    let total = 0;

    for (const item in window.pedidoActual) {
        const producto = window.pedidoActual[item];
        const cantidadTotal = producto.cantidad;
        const precioUnitario = producto.precio;

        const subTotal = cantidadTotal * precioUnitario;

        let promo = "";

        if ( cantidadTotal >= 10) {
            const unidadesGratis = Math.floor(cantidadTotal / 10);
            const totalConPromo = cantidadTotal + unidadesGratis;
            promo = ` (incluye ${unidadesGratis} gratis)`;
        }

        const botonEliminar = `<button onclick="eliminarDelRemito('${item}')" style="background: none; border: none; color: #dc3545; font-weight: bold; cursor: pointer; margin-right: 8px; font-size: 14px;" title="Eliminar producto">&times;</button>`;

        html += `<div style="font-size:14px; display: flex; align-items: center; margin-bottom: 4px;">${botonEliminar} •${cantidadTotal}u - ${item.toUpperCase()} ${promo}</div>`;

        total += subTotal;
    }
    
    res.innerHTML = html || "Carrito vacío";
    totalTxt.innerText = `$${total.toLocaleString()}`;
}

window.eliminarDelRemito = function(nombre) {

    if(window.pedidoActual && window.pedidoActual[nombre]) {
        delete window.pedidoActual[nombre];

        dibujarResumen();
    }


}
window.cerrarLista = function() {
    const div = document.getElementById('lista-productos');
    if (div) div.innerHTML = "";
}


window.agregarProductoManual = function() {
    
    const nombreInput = document.getElementById('manual-nombre');
    const precioInput = document.getElementById('manual-precio');
    const cantidadInput = document.getElementById('manual-cantidad');

    const nombre = nombreInput.value.trim();
    const precio = parseFloat(precioInput.value);
    const cantidad = parseInt(cantidadInput.value);

    if (!nombre || isNaN(precio) || isNaN(cantidad) || precio <= 0 || cantidad <= 0) {
        alert("Por favor, ingresa un nombre válido, precio mayor a 0 y cantidad mayor a 0.");
        return;
    }
    
    const productoManual = {
        id: `manual-${Date.now()}`,
        nombre,
        precio,
        cantidad,
    };

    if (!window.pedidoActual) window.pedidoActual = {};

    window.pedidoActual[nombre] = { precio, cantidad };


    nombreInput.value = "";
    precioInput.value = "";
    cantidadInput.value = "1";

    dibujarResumen();
}

window.generarPDF = function() {
    const inputNombre = document.getElementById('nombreCliente');
    const nombreCliente = inputNombre ? inputNombre.value.trim() : "";
    const clienteTexto = nombreCliente !== "" ? nombreCliente.toUpperCase() : "Sin nombre";

    const inputDireccion = document.getElementById('direccionCliente');
    const direccionCliente = inputDireccion ? inputDireccion.value.trim() : "";
    const direccionTexto = direccionCliente !== "" ? direccionCliente.toUpperCase() : "Sin dirección";
    const imgLogo = document.getElementById("logo")

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let datosTabla = [];
    let totalFinal = 0;

    for (const nombre in window.pedidoActual) {
        const item = window.pedidoActual[nombre];
        const cantidadComprada = item.cantidad;
        const precioUnitario = item.precio;
        const subtotal = cantidadComprada * precioUnitario;

        totalFinal += subtotal;
        
        let textoCantidad = cantidadComprada.toString();

        if (cantidadComprada >= 10) {
            const unidadesGratis = Math.floor(cantidadComprada / 10);
        
            textoCantidad += ` + ${unidadesGratis}`;
        }

        datosTabla.push([
            textoCantidad, 
            nombre.toUpperCase(),
            `$${precioUnitario.toLocaleString()}`,
            `$${subtotal.toLocaleString()}`
        ]);
    }

    const filasMinimas = 22;
    while (datosTabla.length < filasMinimas) {
        datosTabla.push(["", "", "", ""]); 
    }

// --- ENCABEZADO ESTILO REMITO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    if (imgLogo) {
        const imgWidth = 65;
        const imgHeight = (imgLogo.naturalHeight / imgLogo.naturalWidth) * imgWidth;
        doc.addImage(imgLogo, 'PNG', 15, -5, imgWidth, imgHeight);
    } 
    doc.setFontSize(9);
    doc.text("DOCUMENTO NO VALIDO COMO FACTURA", 140, 20); 
    

    doc.setFontSize(10);
    doc.text("MES / DIA / AÑO", 140, 30);
    doc.text(`${new Date().toLocaleDateString()}`, 140, 35);

    // --- DATOS DEL CLIENTE ---
    doc.rect(15, 45, 180, 25); 
    doc.text(`SEÑOR/ES: ${clienteTexto}`, 20, 52); // 
    doc.text(`DIRECCION: ${direccionTexto}`, 20, 60); // 
    doc.text(`LOCALIDAD: PART. DE LA COSTA, BUENOS AIRES`, 20, 67); 


    // tabla con autoTable 
    doc.autoTable({
        startY: 85,
        head: [['CANTIDAD', 'DESCRIPCION', 'PRECIO C/U', 'IMPORTE']],
        body: datosTabla,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
        styles: { minCellHeight: 8 },
        columnStyles: {
            0: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        }
    });

    // --- TOTAL ---
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: $${totalFinal.toLocaleString()}`, 140, finalY); // 

    doc.save(`Remito_${clienteTexto}.pdf`);
}

cargarProductos();
