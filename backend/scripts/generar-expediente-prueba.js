const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

const outputDirectory = path.resolve(__dirname, '../../ejemplos');
const outputPath = path.join(outputDirectory, 'expediente-rag-prueba.pdf');

fs.mkdirSync(outputDirectory, { recursive: true });

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 62, right: 58, bottom: 62, left: 58 },
  bufferPages: true,
  info: {
    Title: 'Expediente ficticio LM-2026-0042',
    Author: 'LegalMind - material de prueba',
    Subject: 'Documento ficticio para validación de recuperación RAG',
  },
});

const output = fs.createWriteStream(outputPath);
doc.pipe(output);

const body = (text, options = {}) => {
  doc.font('Helvetica').fontSize(10.5).fillColor('#20242a');
  doc.text(text, { lineGap: 3, align: 'justify', ...options });
  doc.moveDown(0.7);
};

const heading = (text) => {
  doc.moveDown(0.25);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#182b49').text(text);
  doc.moveDown(0.55);
};

const label = (name, value) => {
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#20242a').text(`${name}: `, { continued: true });
  doc.font('Helvetica').text(value);
};

doc.font('Helvetica-Bold').fontSize(20).fillColor('#182b49')
  .text('EXPEDIENTE FICTICIO PARA PRUEBA DE RAG', { align: 'center' });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(9).fillColor('#8b1e2d')
  .text('DOCUMENTO SIMULADO — NO CORRESPONDE A PERSONAS NI HECHOS REALES', { align: 'center' });
doc.moveDown(1.5);

label('Expediente', 'LM-2026-0042');
label('Carátula', 'Fiscalía c/ Martín Salvatierra s/ hurto');
label('Tribunal', 'Juzgado de Garantías N.º 3 de Ciudad Delta');
label('Fiscal interviniente', 'Dra. Laura Méndez');
label('Defensa', 'Dr. Tomás Ibarra');
label('Imputado', 'Martín Salvatierra, DNI ficticio 31.456.789');

doc.moveDown(1.2);
heading('1. HECHO INVESTIGADO');
body('El 12 de junio de 2026, aproximadamente a las 18:40, se denunció la desaparición de una computadora portátil marca Boreal, modelo B14, color gris, número de serie BRL-88421, perteneciente a la biblioteca pública Mariano Moreno. El inventario interno asignaba al equipo un valor de reposición de 1.480.000 pesos.');
body('La bibliotecaria Ana Ruiz declaró que vio al imputado dentro de la sala de lectura a las 18:15. Aclaró expresamente que no lo vio tomar ni retirar la computadora y que perdió contacto visual con él durante aproximadamente veinte minutos.');

heading('2. REGISTRO DE CÁMARAS');
body('El acta policial del 13 de junio de 2026 indica que la cámara del acceso principal registró a una persona saliendo a las 18:47 con una mochila oscura. La imagen no permite identificar el rostro ni observar el contenido de la mochila.');
body('El informe técnico de la División Video Forense, emitido el 18 de junio de 2026, estableció que el reloj de la cámara tenía un adelanto de once minutos. Por lo tanto, la hora real estimada de la grabación es 18:36 y no 18:47. El archivo disponible es una copia comprimida; el original todavía no fue entregado para su análisis.');

doc.addPage();
heading('3. DECLARACIONES TESTIMONIALES');
body('Carlos Vega declaró el 14 de junio de 2026 que encontró a Martín Salvatierra en la parada de colectivos de avenida Norte a las 19:05. Según su primera declaración, Martín no llevaba mochila ni bolso.');
body('En una ampliación del 22 de junio de 2026, Carlos Vega manifestó que no podía asegurar si Martín llevaba una mochila porque había poca iluminación y el encuentro duró menos de un minuto. Explicó que su primera afirmación había sido demasiado categórica. Esta rectificación constituye una contradicción relevante para valorar la precisión de su testimonio.');
body('Ana Ruiz amplió su declaración el 24 de junio. Recordó que, poco antes del cierre, una persona preguntó por un libro reservado bajo la frase “Cedro Azul 17”. No pudo afirmar que esa persona fuera Martín ni explicar la relación de la frase con la computadora. La expresión Cedro Azul 17 no aparece en ningún otro elemento incorporado al expediente.');

heading('4. ALLANAMIENTO Y ELEMENTOS SECUESTRADOS');
body('El 20 de junio de 2026 se realizó un allanamiento en el domicilio del imputado. Se secuestró una mochila azul y una computadora marca Austral, modelo A10, número de serie AST-11903. El acta deja constancia de que la computadora secuestrada no coincide en marca, modelo ni número de serie con el equipo denunciado por la biblioteca.');
body('No se encontró la computadora Boreal B14, número de serie BRL-88421. Tampoco se hallaron piezas, cargadores, etiquetas de inventario ni publicaciones de venta vinculables al objeto buscado. La mochila secuestrada es azul; la grabación solamente permite describir la mochila observada como oscura.');

heading('5. INFORME DE GEOLOCALIZACIÓN');
body('La empresa telefónica informó el 25 de junio de 2026 que el teléfono del imputado se conectó a una antena con cobertura sobre la biblioteca entre las 18:02 y las 18:33. Desde las 18:38 se registraron conexiones en una antena ubicada a 2,8 kilómetros, cerca de la estación central.');
body('El informe advierte que la localización por antenas es aproximada, que las áreas de cobertura pueden superponerse y que estos datos no permiten determinar una dirección exacta ni identificar quién portaba el dispositivo.');

doc.addPage();
heading('6. PERICIA INFORMÁTICA');
body('La pericia practicada sobre la computadora Austral A10 secuestrada no encontró fotografías, búsquedas, comunicaciones ni registros de conexión asociados al equipo Boreal B14. La fecha de adquisición documentada de la Austral es el 3 de marzo de 2024. No se detectaron borrados masivos durante junio de 2026.');
body('El análisis del teléfono identificó una compra de pasaje de colectivo realizada a las 18:39 del 12 de junio, con salida desde la estación central a las 18:55. El comprobante acredita la operación digital, pero no demuestra por sí solo que el imputado haya abordado el transporte.');

heading('7. MEDIDAS PROCESALES Y VENCIMIENTOS');
body('El 27 de junio de 2026 el juzgado ordenó una pericia comparativa sobre las imágenes de la cámara. La fiscalía debe entregar el material original sin compresión antes del 5 de julio de 2026. La audiencia de control fue fijada para el 12 de julio de 2026 a las 09:30, en la sala 4 del edificio judicial.');
body('La resolución dispone que la cadena de custodia del archivo original deberá incluir identificación de la persona que realizó la extracción, fecha, soporte utilizado y suma de verificación SHA-256. La omisión deberá informarse al tribunal antes de comenzar la pericia.');

heading('8. CRONOLOGÍA CONSOLIDADA');
body('18:02 a 18:33 — El teléfono registra conexión con la antena que cubre la biblioteca.\n18:15 — Ana Ruiz ve a Martín en la sala de lectura.\n18:36 — Hora real estimada de la persona captada por la cámara.\n18:38 — El teléfono comienza a conectarse cerca de la estación central.\n18:39 — Se registra la compra digital de un pasaje.\n18:40 — Hora aproximada de la denuncia de desaparición.\n18:55 — Horario de salida consignado en el pasaje.\n19:05 — Carlos Vega manifiesta haber encontrado a Martín en una parada.');

heading('9. ESTADO DE LA EVIDENCIA AL 30 DE JUNIO DE 2026');
body('La computadora denunciada no fue recuperada. No se levantaron huellas útiles del escritorio y no existe un testigo que haya visto al imputado tomar o retirar el equipo. Permanecen pendientes la pericia comparativa de video y la entrega del archivo original por parte de la fiscalía.');
body('Los elementos reunidos ubican al imputado en el área general de la biblioteca antes del hecho, pero presentan limitaciones de identificación, precisión temporal y geolocalización. El allanamiento no recuperó el objeto denunciado y el testimonio de Carlos Vega fue rectificado.');

doc.addPage();
heading('10. PREGUNTAS SUGERIDAS PARA VALIDAR EL RAG');
body('1. ¿Cuál era la marca, el modelo y el número de serie de la computadora denunciada?\n2. ¿Qué diferencia existe entre la hora registrada por la cámara y la hora real estimada?\n3. ¿Qué contradicción presenta el testimonio de Carlos Vega?\n4. ¿La computadora secuestrada coincide con la denunciada? Fundamentá con sus datos.\n5. ¿Qué debe entregar la fiscalía antes del 5 de julio de 2026?\n6. ¿Qué ocurrió con el teléfono entre las 18:33 y las 18:38?\n7. ¿Cuál es la frase singular mencionada por Ana Ruiz y qué valor probatorio tiene?\n8. Enumerá las pruebas favorables y desfavorables para el imputado, indicando sus limitaciones.');

heading('11. RESPUESTAS DE CONTROL');
body('Este apartado sirve para comprobar manualmente la exactitud de las respuestas del sistema. Equipo denunciado: Boreal B14, serie BRL-88421. Equipo secuestrado: Austral A10, serie AST-11903. Corrección de cámara: once minutos de adelanto; 18:47 registrada equivale aproximadamente a 18:36 real. Frase singular: Cedro Azul 17. Vencimiento: entrega del video original sin compresión antes del 5 de julio de 2026. Audiencia: 12 de julio de 2026 a las 09:30, sala 4.');

doc.moveDown(1.4);
doc.font('Helvetica-Oblique').fontSize(9).fillColor('#555b65')
  .text('Documento ficticio creado exclusivamente para probar extracción de texto, recuperación semántica, citas y análisis mediante RAG.', { align: 'center' });

const range = doc.bufferedPageRange();
for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
  doc.switchToPage(pageIndex);
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text('LegalMind — Expediente simulado LM-2026-0042', 58, 28, {
    width: 479,
    align: 'center',
    lineBreak: false,
  });
  doc.text(`Página ${pageIndex + 1} de ${range.count}`, 58, 805, {
    width: 479,
    align: 'center',
    lineBreak: false,
  });
}

doc.end();

output.on('finish', () => {
  console.log(outputPath);
});
