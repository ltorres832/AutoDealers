// Widget de texto seleccionable para Flutter Web
import 'package:flutter/material.dart';

/// Widget de texto que permite seleccionar y copiar en Flutter Web
class SelectableTextWidget extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;
  final bool? softWrap;

  const SelectableTextWidget(
    this.text, {
    super.key,
    this.style,
    this.textAlign,
    this.maxLines,
    this.overflow,
    this.softWrap,
  });

  @override
  Widget build(BuildContext context) {
    return SelectableText(
      text,
      style: style,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
    );
  }
}

/// Extensión para hacer Text widgets seleccionables fácilmente
extension SelectableTextExtension on Text {
  Widget toSelectable() {
    return SelectableText(
      data ?? '',
      style: style,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      textScaleFactor: textScaleFactor,
      textDirection: textDirection,
      locale: locale,
      softWrap: softWrap,
      semanticsLabel: semanticsLabel,
    );
  }
}


