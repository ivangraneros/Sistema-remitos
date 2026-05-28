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
        const subtotal = window.pedidoActual[item].cantidad * window.pedidoActual[item].precio;
        html += `<div style="font-size:12px;">• ${item} x ${window.pedidoActual[item].cantidad}</div>`;
        total += subtotal;
    }
    
    res.innerHTML = html || "Carrito vacío";
    totalTxt.innerText = `$${total}`;
}


window.cerrarLista = function() {
    const div = document.getElementById('lista-productos');
    if (div) div.innerHTML = "";
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
        const subtotal = item.cantidad * item.precio;
        totalFinal += subtotal;
        
        datosTabla.push([
            item.cantidad, 
            nombre.toUpperCase(),
            `$${item.precio.toLocaleString()}`,
            `$${subtotal.toLocaleString()}`
        ]);
    }

    const filasMinimas = 22;
    while (datosTabla.length < filasMinimas) {
        datosTabla.push(["", "", ""]); 
    }

// --- ENCABEZADO ESTILO REMITO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    if (imgLogo) {
        const imgWidth = 30;
        const imgHeight = (imgLogo.naturalHeight / imgLogo.naturalWidth) * imgWidth;
        doc.addImage(imgLogo, 'JPEG', 15, 10, imgWidth, imgHeight);
    } 
    doc.setFontSize(9);
    doc.text("DOCUMENTO NO VALIDO COMO FACTURA", 140, 20); 
    

    doc.setFontSize(10);
    doc.text("DIA / MES / AÑO", 140, 30);
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
