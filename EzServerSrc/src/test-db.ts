import prisma from "./prisma";


async function main() {
    const category = await prisma.category.create(
        {
            data: {
                name: '手机数码'
            }
        }
    );
    console.log('创建分类:', category);

    const product = await prisma.product.create({
        data: {
            name: 'iPhone 15',
            description: '苹果最新手机',
            price: 5999.9,
            stock: 100,
            categoryId: category.id,
            imageUrls:  ['https://example.com/iphone15.jpg']
        }
    });
    console.log('创建商品:', product);

    const products = await prisma.product.findMany({
        include: {category: true}
    })
    console.log('商品列表:', JSON.stringify(products, null, 2));

    const updated = await prisma.product.update({
        where: {id: product.id},
        data: { stock: {decrement: 1}}
    });
    console.log('更新后库存:', updated.stock);

    await prisma.product.delete({ where: { id: product.id }});
    await prisma.category.delete({ where: { id: category.id } });

}

main().catch(console.error).finally(() => prisma.$disconnect())