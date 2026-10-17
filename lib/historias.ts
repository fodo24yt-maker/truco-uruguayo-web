/**
 * La historia de cada rival de la gira.
 *
 * ES OTRA COSA QUE LA `descripcion`. La descripción es información de juego
 * —a qué atenerte contra él— y la historia es quién es. Se decidió el 10/9/2026
 * que fueran dos cosas y no una: mezcladas no sirven para ninguna de las dos.
 *
 * NO VIVE EN `personalidades.ts`, igual que la cara (`caras.ts`). La
 * `Personalidad` es lo que lee el motor, y el banco de pruebas arma blancos de
 * medición con ese mismo tipo: un campo de texto obligatorio ahí obligaría a
 * tocar los metros con los que se mide la gira para algo que el bot no lee.
 *
 * CADA HISTORIA EXPLICA CÓMO JUEGA. Si dice que miente, en la mesa miente: el
 * Pescador canta con nada porque pesca sin carnada, el Gallego se va del vale
 * cuatro porque madruga para ordeñar. Una historia que promete algo que los
 * números de `personalidades.ts` no hacen es una mentira al jugador.
 *
 * TIENEN UN LARGO MÁXIMO, y lo cuida el test: se leen en la ficha de la gira,
 * que tiene el alto reservado para que el mapa no cambie de tamaño (ver
 * `app/jugar/gira/page.tsx`). Una historia más larga no agranda la ficha: la
 * hace scrollear.
 *
 * Se cruzan entre ellas a propósito: Tito le cuenta a Peralta cómo jugás, y
 * todos hablan del Turco, que es el último y la leyenda de la gira.
 *
 * La clave es el `id` de la personalidad, que no se toca nunca (es la clave del
 * progreso). El `nombre` sí puede cambiar: si cambia, revisar que la historia
 * no lo nombre por el viejo.
 */

export const HISTORIAS: Record<string, string> = {
  // ★1 · el área metropolitana
  luki:
    "Aprendió a jugar en el recreo del liceo, con un mazo al que le faltaba el siete de oro. " +
    "La única vez que quiso mentir, en segundo, se le puso roja la oreja y se dio cuenta toda la clase: " +
    "no mintió nunca más. Sueña con jugarle algún día al Turco, aunque todavía no sabe bien dónde queda Melo.",
  "la-coca":
    "Vende fruta en la feria desde los catorce y no sabe hacer nada en voz baja. " +
    "Grita “¡envido!” igual que grita “¡a cien el cajón!”, tenga o no tenga. " +
    "Para ella, un cliente callado es un cliente que no compra.",
  "el-rulo":
    "Hijo de tambero: a las cinco de la mañana ordeña y a las diez de la noche está en la cama, " +
    "todos los días desde que tiene memoria. Del abuelo, que vino de Galicia, heredó la boina y la desconfianza. " +
    "El vale cuatro lo pone nervioso porque le alarga la noche.",

  // ★2 · el este y la costa
  tito:
    "Hace treinta años que maneja el camión por la Ruta 5. Para siempre en el mismo parador, pide lo mismo " +
    "y juega igual, y a las diez en punto arranca, vaya ganando o perdiendo. " +
    "Conoce a toda la ruta y le cuenta a todo el mundo cómo jugó cada uno… así que Peralta va a saber de vos.",
  "la-nelly":
    "Teje mientras juega y no levanta la vista de las agujas. Lleva la medallita de la Virgen del Verdún " +
    "que le regaló la madre. No canta nunca primero: te deja hablar, dice “quiero” y sigue tejiendo. " +
    "En Minas dicen que nunca perdió una bufanda ni una partida.",
  marito:
    "En temporada es guía del Castillo de Piria y les cuenta a los turistas que Piria era alquimista, " +
    "que es cierto. Lo que no es cierto es que él también: cree que un cuatro de copas, cantado con ganas, " +
    "se vuelve el ancho de espadas. De marzo a diciembre no queda nadie en Piriápolis a quién contárselo.",
  "el-pescador":
    "Nadie en La Paloma sabe cómo se llama. Dice que la corvina más grande del puerto la sacó con un anzuelo " +
    "sin carnada, y en la mesa hace lo mismo: canta con nada y se queda mirando a ver si picás. " +
    "El anzuelo lo lleva en el bolsillo, por si acaso.",

  // ★3 · el centro
  "don-aparicio":
    "Cuarenta zafras de arroz midiendo el agua de la chacra al centímetro. Para él no hay apuro: " +
    "el arroz sale cuando sale. Silba a Los Olimareños mientras reparte y lleva los tantos de memoria, " +
    "sin anotador. Nadie lo vio equivocarse en una cuenta.",
  cachila:
    "Le dicen Cachila por el Ford A del 29 que restauró pieza por pieza. Anota todo con la lapicera del " +
    "bolsillo: los litros de nafta, los kilos de la feria ganadera y los tantos de la mesa. " +
    "Antes de mirar las cartas, mira el anotador.",
  "el-trinitario":
    "Una patada en un partido de baby fútbol en el 78 le dejó la pierna mala, y cambió la cancha por la " +
    "mesa del club social. Dice que en Flores, que es el departamento con menos gente, se piensa más. " +
    "Y siendo de Flores, la flor se la toma como algo personal.",
  "la-rosa":
    "Hija de chacareros de trigo: aprendió de gurisa que el trigo se corta dorado, ni un día antes. " +
    "Te deja ganar las primeras manos como quien mira crecer la espiga, y cuando estás tranquilo, cosecha. " +
    "En Mercedes nadie juega con ella a las apuradas.",

  // ★4 · el litoral y la frontera
  "el-tucho":
    "Hace treinta años que mueve a mano el puente giratorio de Carmelo, con la llave de hierro que lleva " +
    "a todos lados. Vio pasar cada velero que bajó por el arroyo y se acuerda de todos: de vos también se " +
    "va a acordar. A los turistas les jura que el puente lo armó él.",
  "el-fray":
    "El abuelo trabajó en el frigorífico Anglo, el de las latas que se comió medio mundo, y Cacho heredó " +
    "una sin abrir que tiene en la repisa. De ahí sacó que lo bueno se guarda. Puede pasar diez manos sin " +
    "decir nada, pero si te quiere el truco, es que tiene.",
  beto:
    "Tiene el bar más viejo de la costanera. En la Semana de la Cerveza atiende a quinientas personas y " +
    "juega una partida al mismo tiempo, sin que se le corra un pelo del gel. " +
    "Te canta retruco con la misma cara con la que te trae la cuenta.",
  "don-ramon":
    "Cuarenta zafras de naranja: mira un árbol y te dice cuántos cajones da, y te mira agarrar las cartas " +
    "y más o menos sabe qué tenés. A la tardecita se va a las termas de Daymán y vuelve más tranquilo que vos. " +
    "Dice que el único que le gana seguido es el Turco, y de eso no habla.",
  "el-piedra":
    "Vive donde se juntan tres países, y cuando lo tenés acorralado siempre encuentra una frontera para " +
    "cruzarse. Los domingos va a Catalán a buscar amatistas, y por eso hay quien le dice el Piedra. " +
    "En la mesa le dicen Pájaro: se te vuela.",
  joao:
    "Se llama João, pero en Rivera nadie le dice así. Vende perfumes en un free shop: a los brasileros les " +
    "habla en castellano y a los uruguayos en portugués. No se calla nunca, ni cuando miente, y nunca sabés " +
    "si te está cargando. Lo que sí sabés es que se acuerda de cómo jugás.",

  // ★5 · el norte gaucho
  peralta:
    "Veinte años jineteando en la Patria Gaucha le enseñaron que no gana el que pega primero, sino el que " +
    "aguanta arriba del caballo. Antes de sentarse preguntó por vos en cada parador de la Ruta 5, y Tito le " +
    "contó todo. Es el único que le ganó una final al Turco. Una sola vez.",
  "el-melo":
    "El abuelo cruzaba la frontera vendiendo telas puerta por puerta, y le enseñó que al cliente se lo mira " +
    "a los ojos, no a las manos. Le dicen el Turco aunque la familia era libanesa, y ya no corrige a nadie. " +
    "Toma de una guampa que nadie más toca. Todos en la gira hablan de él; casi ninguno le ganó.",
};

/** La historia de un rival, o `null` si todavía no tiene. */
export const historiaDe = (id: string): string | null =>
  Object.hasOwn(HISTORIAS, id) ? HISTORIAS[id] : null;
