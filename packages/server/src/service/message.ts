class Message extends Array {
  text(text: string) {
    this.push({ type: 'text', data: { text } });
    return this;
  }

  image(file: string | Buffer) {
    this.push({
      type: 'image',
      data: {
        file: Buffer.isBuffer(file)
          ? `base64://${file.toString('base64')}`
          : file,
      },
    });
    return this;
  }

  at(qq: string | number) {
    this.push({ type: 'at', data: { qq } });
    return this;
  }
}

export default (): Message => new Message();
