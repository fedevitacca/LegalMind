const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

const outputDirectory = path.resolve(__dirname, '../../ejemplos');
fs.mkdirSync(outputDirectory, { recursive: true });

const decisions = [
  {
    fileName: 'fallo-a-absolucion-indicios.pdf',
    title: 'FALLO A — ABSOLUCIÓN POR INDICIOS INSUFICIENTES',
    caseNumber: 'CD-2025-118',
    caption: 'Fiscalía c/ Julián López s/ hurto',
    court: 'Cámara Penal de Ciudad Delta, Sala I',
    date: '14 de noviembre de 2025',
    facts: 'Se atribuyó a Julián López la sustracción de una notebook de un centro cultural. Una cámara registró a una persona con campera oscura cerca de la salida y el teléfono del acusado se conectó a una antena que cubría varias manzanas del lugar. El objeto no fue recuperado y ningún testigo vio la sustracción.',
    evidence: 'La grabación no permitía reconocer el rostro ni individualizar la prenda. La geolocalización por antenas sólo ubicaba al teléfono dentro de un área aproximada. El acusado había concurrido al centro cultural esa tarde, circunstancia que explicó su presencia en la zona. No se encontraron huellas útiles, comunicaciones de venta ni posesión posterior del equipo.',
    prosecution: 'La fiscalía sostuvo que la presencia acreditada de López, su salida dentro de la franja temporal del hecho y la coincidencia general de la vestimenta permitían inferir la autoría. Agregó que el acusado no recordó con precisión cuándo abandonó el edificio y pidió valorar esa imprecisión junto con el registro telefónico.',
    defense: 'La defensa señaló que el centro cultural recibió a más de cuarenta personas durante esa tarde, que la antena abarcaba también el domicilio y el lugar de trabajo del acusado y que la cámara no mostraba ningún objeto. Planteó que la fiscalía convirtió circunstancias neutras en indicios de cargo sin establecer un vínculo material con la notebook.',
    analysis: 'El tribunal tuvo por probado que López estuvo en el edificio, pero distinguió presencia de autoría. La cámara no permitía afirmar que la persona registrada fuera el acusado y tampoco mostraba la notebook. La conexión telefónica era compatible tanto con el lugar del hecho como con otros puntos de la zona. La falta de precisión al recordar el horario no fue considerada un indicio autónomo porque la entrevista ocurrió nueve días después. Para la Sala, ninguna prueba conectó a López con la disposición, ocultamiento o venta del equipo. La hipótesis fiscal era posible, pero no alcanzaba el grado de certeza requerido para condenar.',
    holding: 'La Sala absolvió al acusado. Consideró que la presencia en la zona y una imagen no identificable constituían indicios compatibles con la hipótesis fiscal, pero no formaban un conjunto cerrado que excluyera explicaciones alternativas razonables.',
    rule: 'Una condena basada en indicios exige que éstos sean plurales, concordantes y suficientemente precisos. La suma de datos ambiguos no reemplaza la prueba de autoría. La duda razonable subsiste cuando cada indicio admite una explicación inocente no refutada.',
    scope: 'La Sala aclaró que no exige prueba directa ni recuperación del objeto en todos los casos. La absolución se fundó en la baja precisión de los indicios concretos y en la ausencia de corroboración externa, no en una regla general que impida condenar mediante prueba indiciaria.',
    outcome: 'Absolución. Costas por su orden.',
  },
  {
    fileName: 'fallo-b-condena-indicios.pdf',
    title: 'FALLO B — CONDENA POR INDICIOS CONVERGENTES',
    caseNumber: 'CD-2025-204',
    caption: 'Fiscalía c/ Emilia Pereyra s/ hurto',
    court: 'Cámara Penal de Ciudad Delta, Sala II',
    date: '3 de febrero de 2026',
    facts: 'Se atribuyó a Emilia Pereyra la sustracción de una notebook de una oficina comunitaria. Dos cámaras consecutivas registraron a la acusada entrando sin bolso y saliendo doce minutos después con una mochila. Una empleada la identificó por el rostro y la vestimenta.',
    evidence: 'La notebook fue encontrada al día siguiente en poder de la acusada y coincidía en marca, modelo y número de serie con el inventario. Un mensaje enviado desde su teléfono ofrecía vender el equipo dos horas después del hecho. La defensa cuestionó la calidad de una cámara, pero no impugnó la identificación de la testigo, el secuestro ni el peritaje del teléfono.',
    prosecution: 'La fiscalía afirmó que cada elemento tenía origen independiente: las cámaras fijaban la secuencia, la testigo identificaba a Pereyra, el secuestro acreditaba la posesión del mismo equipo y la pericia vinculaba el ofrecimiento de venta con su teléfono. Sostuvo que la convergencia descartaba una coincidencia casual.',
    defense: 'La defensa alegó que la mochila podía contener efectos personales, que la acusada había recibido la notebook de un tercero esa misma noche y que otra persona conocía la clave del teléfono. Cuestionó además que una de las cámaras tuviera baja resolución y pidió aplicar el estándar de duda razonable.',
    analysis: 'El tribunal consideró que la baja calidad de una cámara no debilitaba el cuadro completo porque la segunda toma y la identificación de la empleada permitían reconocer a Pereyra. La explicación sobre la entrega por un tercero no fue acompañada por nombre, conversación, comprobante ni testigo. La coincidencia exacta del número de serie descartó una confusión de objeto. El mensaje de venta, enviado poco después desde una sesión autenticada en el teléfono, aportó un dato temporal y conductual adicional. Valorados en conjunto, los indicios no eran meramente compatibles con la acusación: se reforzaban recíprocamente y dejaban sin apoyo concreto la alternativa defensiva.',
    holding: 'La Sala confirmó la condena. Entendió que las imágenes, la identificación presencial, la posesión inmediata del objeto y el mensaje de venta eran indicios independientes que se corroboraban entre sí y descartaban una adquisición casual.',
    rule: 'La prueba indiciaria puede sostener una condena cuando parte de hechos acreditados, presenta enlaces lógicos verificables y forma un cuadro convergente. La valoración debe ser conjunta y debe explicar por qué las hipótesis alternativas carecen de respaldo concreto.',
    scope: 'El fallo destacó que la posesión reciente del objeto no produce por sí sola una presunción automática de culpabilidad. En este caso adquirió fuerza por su conexión con la secuencia de cámaras, la identificación personal y el ofrecimiento de venta.',
    outcome: 'Condena a un año y seis meses de prisión de ejecución condicional y reglas de conducta.',
  },
];

function writeDecision(decision) {
  const outputPath = path.join(outputDirectory, decision.fileName);
  const doc = new PDFDocument({ size: 'A4', margins: { top: 64, right: 58, bottom: 64, left: 58 } });
  doc.pipe(fs.createWriteStream(outputPath));
  doc.font('Helvetica-Bold').fontSize(17).fillColor('#182b49').text(decision.title, { align: 'center' });
  doc.moveDown(0.5).font('Helvetica').fontSize(9).fillColor('#8b1e2d')
    .text('DOCUMENTO FICTICIO PARA PRUEBAS — SIN VALOR JURÍDICO', { align: 'center' });
  doc.moveDown(1.5);

  const field = (label, value) => {
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#20242a').text(`${label}: `, { continued: true });
    doc.font('Helvetica').text(value);
  };
  const section = (title, text) => {
    doc.moveDown(1).font('Helvetica-Bold').fontSize(12).fillColor('#182b49').text(title);
    doc.moveDown(0.4).font('Helvetica').fontSize(10.5).fillColor('#20242a')
      .text(text, { align: 'justify', lineGap: 3 });
  };

  field('Expediente', decision.caseNumber);
  field('Carátula', decision.caption);
  field('Tribunal', decision.court);
  field('Fecha', decision.date);
  section('1. HECHOS', decision.facts);
  section('2. PRUEBA VALORADA', decision.evidence);
  section('3. POSTURA DE LA FISCALÍA', decision.prosecution);
  section('4. POSTURA DE LA DEFENSA', decision.defense);
  section('5. FUNDAMENTOS DEL TRIBUNAL', decision.analysis);
  section('6. DECISIÓN', decision.holding);
  section('7. CRITERIO', decision.rule);
  section('8. ALCANCE DEL FALLO', decision.scope);
  section('9. PARTE RESOLUTIVA', decision.outcome);
  doc.moveDown(1.5).font('Helvetica-Oblique').fontSize(9).fillColor('#687180')
    .text('Material creado exclusivamente para comparar razonamiento, suficiencia probatoria y aplicación del estándar de duda razonable.', { align: 'center' });
  doc.end();
  return outputPath;
}

for (const decision of decisions) console.log(writeDecision(decision));
