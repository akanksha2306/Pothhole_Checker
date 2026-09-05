/** piexifjs ships no types; only the API surface this app uses. */
declare module 'piexifjs' {
  // EXIF tag values are heterogeneous (rational tuples, strings, numbers) and
  // are written as computed keys, so the map is typed loosely.
  interface ExifDict {
    [ifd: string]: Record<string, unknown> | undefined
  }

  namespace PiexifJs {
    const GPSIFD: Record<
      | 'GPSVersionID'
      | 'GPSLatitudeRef'
      | 'GPSLatitude'
      | 'GPSLongitudeRef'
      | 'GPSLongitude'
      | 'GPSMapDatum'
      | 'GPSAltitudeRef'
      | 'GPSAltitude',
      number
    >

    const GPSHelper: {
      degToDmsRational(deg: number): [number, number][]
      dmsRationalToDeg(dms: [number, number][], ref: string): number
    }
  }

  const piexif: {
    GPSIFD: typeof PiexifJs.GPSIFD
    GPSHelper: typeof PiexifJs.GPSHelper
    load(jpegDataUrlOrBytes: string): ExifDict
    dump(exifObj: ExifDict): string
    /** Returns a new data URL with the EXIF segment inserted. */
    insert(exifBytes: string, jpegDataUrlOrBytes: string): string
  }

  export = piexif
}
